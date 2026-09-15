import { useI18n } from '../i18n'

const messages = {
  fr: {
    title: 'Mycelium 3D', view2d: 'Vue 2D', view3d: 'Vue 3D', quality: 'Qualité 3D',
    auto: 'Automatique', eco: 'Économique', balanced: 'Équilibrée', high: 'Élevée',
    select: 'Sélectionner un élément', none: 'Aucune sélection', focus: 'Centrer la sélection',
    reset: 'Vue d’ensemble', zoomIn: 'Rapprocher', zoomOut: 'Éloigner', open: 'Ouvrir l’élément',
    hint: 'Glissez pour tourner, pincez ou utilisez les boutons pour zoomer. Maj + clic pour sélectionner plusieurs éléments.',
    fallback: 'La vue 3D est indisponible. Votre carte et votre sélection restent accessibles en 2D.',
    retry: 'Réessayer la 3D', loading: 'Préparation de la vue 3D…', paused: 'Vue 3D en pause',
    loadError: 'Les réglages 3D n’ont pas pu être chargés. La carte 2D reste disponible.',
    restore: 'Recharger les réglages 3D', refresh: 'Actualiser les données',
    pending: 'Actualisation…', failedRefresh: 'Actualisation impossible. Réessayez pour lire les dernières données.',
    group: 'Groupes', selected: 'Sélection',
    animate: 'Animer le réseau', lifeHint: 'La lumière exprime la vitalité du réseau, pas l’exécution d’une tâche.',
  },
  en: {
    title: '3D Mycelium', view2d: '2D view', view3d: '3D view', quality: '3D quality',
    auto: 'Automatic', eco: 'Economy', balanced: 'Balanced', high: 'High',
    select: 'Select an item', none: 'No selection', focus: 'Focus selection',
    reset: 'Overview', zoomIn: 'Zoom in', zoomOut: 'Zoom out', open: 'Open item',
    hint: 'Drag to orbit, pinch or use the buttons to zoom. Shift + click to select multiple items.',
    fallback: '3D is unavailable. Your map and selection remain accessible in 2D.',
    retry: 'Retry 3D', loading: 'Preparing 3D view…', paused: '3D view paused',
    loadError: '3D preferences could not be loaded. The 2D map remains available.',
    restore: 'Reload 3D preferences', refresh: 'Refresh data',
    pending: 'Refreshing…', failedRefresh: 'Refresh failed. Retry to read the latest data.',
    group: 'Groups', selected: 'Selection',
    animate: 'Animate the network', lifeHint: 'Light expresses the vitality of the network, not task execution.',
  },
} as const

export function useSpatialMessages() {
  const { language } = useI18n()
  return messages[language]
}
