import {
  FilesetResolver,
  FaceLandmarker,
  HandLandmarker,
  PoseLandmarker,
  ImageSegmenter,
} from '@mediapipe/tasks-vision'
import { fetchModel, isCached, pruneOldCaches } from './modelCache'

export { pruneOldCaches }

/**
 * بارگذاری مدل‌های MediaPipe — همیشه از مسیر محلی همین اپ.
 * هیچ آدرس CDN‌ای اینجا نیست و نباید اضافه شود؛ فایل‌های wasm در
 * `public/mediapipe/wasm` و مدل‌ها در `public/mediapipe/models` هستند.
 *
 * سه نکتهٔ مهم برای سرعت، که همه‌شان روی تجربهٔ اولین باز شدن اثر دارند:
 *  ۱) موتور wasm بین همهٔ دسته‌ها مشترک است و به‌محض باز شدن اپ گرم می‌شود.
 *  ۲) مدلِ هر دسته از همان صفحهٔ انتخاب رنگ پیش‌دریافت می‌شود، یعنی وقتی کاربر
 *     دارد رنگ انتخاب می‌کند، دانلود پشت صحنه تمام شده است.
 *  ۳) فایل مدل در Cache Storage می‌ماند، پس دفعهٔ بعد صفر ثانیه طول می‌کشد.
 */
const base = import.meta.env.BASE_URL || '/'
const WASM_PATH = `${base}mediapipe/wasm`
const MODEL = (f) => `${base}mediapipe/models/${f}`

export const MODEL_FILES = {
  face: MODEL('face_landmarker.task'),
  hand: MODEL('hand_landmarker.task'),
  pose: MODEL('pose_landmarker_lite.task'),
  seg: MODEL('selfie_segmenter.tflite'),
}

/* ---------------------------------------------------------- گزارش پیشرفت */
/* هر «کار» یک بار اجرا می‌شود ولی ممکن است چند جا منتظرش باشند، پس پیشرفت
   به همهٔ شنونده‌ها پخش می‌شود و آخرین وضعیت هم نگه داشته می‌شود. */
const jobs = new Map()

function job(key, factory) {
  let j = jobs.get(key)
  if (!j) {
    j = { listeners: new Set(), last: { stage: 'engine', value: 0 }, promise: null }
    jobs.set(key, j)
    const report = (stage, value) => {
      j.last = { stage, value }
      for (const fn of j.listeners) fn(j.last)
    }
    j.promise = factory(report).catch((err) => {
      jobs.delete(key)
      throw err
    })
  }
  return j
}

function subscribe(j, onProgress) {
  if (!onProgress) return j.promise
  onProgress(j.last)
  j.listeners.add(onProgress)
  return j.promise.finally(() => j.listeners.delete(onProgress))
}

/* ------------------------------------------------------------- موتور wasm */
let filesetPromise = null
export function warmRuntime() {
  if (!filesetPromise) {
    filesetPromise = FilesetResolver.forVisionTasks(WASM_PATH).catch((err) => {
      filesetPromise = null
      throw err
    })
  }
  return filesetPromise
}

/** ابتدا GPU؛ اگر ساخت شکست خورد با CPU دوباره تلاش می‌کند. */
async function withDelegateFallback(create) {
  try {
    return await create('GPU')
  } catch (err) {
    console.warn('[aynejan] GPU delegate failed, falling back to CPU', err)
    return await create('CPU')
  }
}

/** سازندهٔ مشترک: موتور، بعد دانلود مدل با درصد، بعد ساخت تسک. */
function makeLoader(key, file, build) {
  return (onProgress) =>
    subscribe(
      job(key, async (report) => {
        report('engine', 0)
        const fileset = await warmRuntime()
        report('model', 0)
        const bytes = await fetchModel(file, (v) => report('model', v))
        report('build', 1)
        return withDelegateFallback((delegate) =>
          // هر تلاش یک کپی تازه می‌گیرد تا بافر مصرف‌شده مشکل نسازد
          build(fileset, bytes.slice(), delegate)
        )
      }),
      onProgress
    )
}

export const loadFaceLandmarker = makeLoader('face', MODEL_FILES.face, (fileset, buf, delegate) =>
  FaceLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetBuffer: buf, delegate },
    runningMode: 'VIDEO',
    numFaces: 1,
    // مدل استاندارد ۴۷۸ لندمارک می‌دهد، یعنی عنبیه هم هست.
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
)

export const loadHandLandmarker = makeLoader('hand', MODEL_FILES.hand, (fileset, buf, delegate) =>
  HandLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetBuffer: buf, delegate },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
)

export const loadPoseLandmarker = makeLoader('pose', MODEL_FILES.pose, (fileset, buf, delegate) =>
  PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetBuffer: buf, delegate },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
)

export const loadSegmenter = makeLoader('seg', MODEL_FILES.seg, (fileset, buf, delegate) =>
  ImageSegmenter.createFromOptions(fileset, {
    baseOptions: { modelAssetBuffer: buf, delegate },
    runningMode: 'VIDEO',
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  })
)

/** مدل‌هایی که هر دسته لازم دارد. */
const NEEDS = {
  lip: [loadFaceLandmarker],
  lens: [loadFaceLandmarker],
  nail: [loadHandLandmarker],
  garment: [loadPoseLandmarker, loadSegmenter],
}

/**
 * پیش‌دریافت مدل‌های یک دسته. از صفحهٔ انتخاب رنگ صدا زده می‌شود تا دانلود
 * پشت صحنه و هم‌زمان با انتخاب کاربر انجام شود. خطا عمداً بلعیده می‌شود؛
 * صفحهٔ پرو خودش دوباره تلاش می‌کند و پیام می‌دهد.
 */
export function prefetchCategory(categoryId) {
  for (const load of NEEDS[categoryId] ?? []) load().catch(() => {})
}

/** آیا مدل‌های این دسته از قبل روی دستگاه هستند؟ */
export async function categoryReady(categoryId) {
  const files = { lip: ['face'], lens: ['face'], nail: ['hand'], garment: ['pose', 'seg'] }[categoryId] ?? []
  const flags = await Promise.all(files.map((k) => isCached(MODEL_FILES[k])))
  return flags.length > 0 && flags.every(Boolean)
}

/** بستن همهٔ مدل‌های بارگذاری‌شده. */
export async function closeAll() {
  for (const [key, j] of jobs) {
    try {
      const t = await j.promise
      t.close?.()
    } catch {
      /* مدل اصلاً بالا نیامده بود */
    }
    jobs.delete(key)
  }
}
