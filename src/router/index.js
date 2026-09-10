import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  {
    path: '/picker/:category',
    name: 'picker',
    component: () => import('@/views/PickerView.vue'),
    props: true,
  },
  {
    path: '/tryon/:category/:item?',
    name: 'tryon',
    component: () => import('@/views/TryOnView.vue'),
    props: true,
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})
