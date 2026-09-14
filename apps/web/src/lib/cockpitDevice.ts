import { useEffect, useState } from 'react'

import type { CockpitDeviceClass, CockpitProfile } from '../CockpitShell'

const DEVICE_KEY_STORAGE = 'nevolium.presentation.device.v1'
const PROFILE_STORAGE = 'nevolium.presentation.profile.v1'
const PROFILE_VALUES = new Set<CockpitProfile>(['balanced', 'focus', 'review'])

function classifyViewport(width: number): CockpitDeviceClass {
  if (width < 640) return 'phone'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

function randomDeviceKey() {
  const random = globalThis.crypto?.randomUUID?.() ?? `ephemeral-${Date.now().toString(36)}`
  return random.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48)
}

export function getPresentationDeviceKey() {
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY_STORAGE)
    if (existing && /^[a-z0-9-]{8,48}$/.test(existing)) return existing
    const created = randomDeviceKey()
    window.localStorage.setItem(DEVICE_KEY_STORAGE, created)
    return created
  } catch {
    return randomDeviceKey()
  }
}

export function getSavedCockpitProfile(): CockpitProfile {
  try {
    const value = window.localStorage.getItem(PROFILE_STORAGE)
    return PROFILE_VALUES.has(value as CockpitProfile) ? (value as CockpitProfile) : 'balanced'
  } catch {
    return 'balanced'
  }
}

export function saveCockpitProfile(profile: CockpitProfile) {
  try {
    window.localStorage.setItem(PROFILE_STORAGE, profile)
  } catch {
    // Presentation still works for storage-restricted/private browsing sessions.
  }
}

export function cockpitWorkspaceKey(
  deviceClass: CockpitDeviceClass,
  deviceKey: string,
  profile: CockpitProfile,
) {
  return `cockpit.v2.${deviceClass}.${deviceKey}.${profile}`
}

export function useCockpitDeviceClass(): CockpitDeviceClass {
  const [deviceClass, setDeviceClass] = useState<CockpitDeviceClass>(() =>
    classifyViewport(window.innerWidth),
  )

  useEffect(() => {
    const update = () => setDeviceClass(classifyViewport(window.innerWidth))
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  return deviceClass
}
