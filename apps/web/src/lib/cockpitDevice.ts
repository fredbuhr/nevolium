import { useEffect, useState } from 'react'

import type { CockpitDeviceClass, CockpitProfile } from '../CockpitShell'

const DEVICE_KEY_STORAGE = 'nevolium.presentation.device.v1'
const WINDOW_KEY_STORAGE = 'nevolium.presentation.window.v1'
const PROFILE_STORAGE = 'nevolium.presentation.profile.v2'
const AMBIENCE_STORAGE = 'nevolium.presentation.ambience.v1'
const WORKSPACE_KEY_PART_MAX_LENGTH = 40
const PROFILE_VALUES = new Set<CockpitProfile>(['balanced', 'focus', 'review'])
const AMBIENCE_VALUES = new Set<CockpitAmbience>(['neural', 'calm', 'minimal'])

export type CockpitAmbience = 'neural' | 'calm' | 'minimal'

function classifyViewport(width: number): CockpitDeviceClass {
  if (width < 640) return 'phone'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

function randomDeviceKey() {
  const random = globalThis.crypto?.randomUUID?.() ?? `ephemeral-${Date.now().toString(36)}`
  return random
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, WORKSPACE_KEY_PART_MAX_LENGTH)
}

function preferenceKey(prefix: string, subjectRef?: string | null) {
  const subject = String(subjectRef || 'anonymous').trim() || 'anonymous'
  return `${prefix}.${encodeURIComponent(subject).slice(0, 160)}`
}

export function getPresentationDeviceKey() {
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY_STORAGE)
    if (existing && /^[a-z0-9-]{8,40}$/.test(existing)) return existing
    const created = randomDeviceKey()
    window.localStorage.setItem(DEVICE_KEY_STORAGE, created)
    return created
  } catch {
    return randomDeviceKey()
  }
}

export function getPresentationWindowKey() {
  try {
    const existing = window.sessionStorage.getItem(WINDOW_KEY_STORAGE)
    if (existing && /^[a-z0-9-]{8,40}$/.test(existing)) return existing
    const created = randomDeviceKey()
    window.sessionStorage.setItem(WINDOW_KEY_STORAGE, created)
    return created
  } catch {
    return randomDeviceKey()
  }
}

export function getSavedCockpitProfile(subjectRef?: string | null): CockpitProfile {
  try {
    const value = window.localStorage.getItem(preferenceKey(PROFILE_STORAGE, subjectRef))
    return PROFILE_VALUES.has(value as CockpitProfile) ? (value as CockpitProfile) : 'balanced'
  } catch {
    return 'balanced'
  }
}

export function saveCockpitProfile(profile: CockpitProfile, subjectRef?: string | null) {
  try {
    window.localStorage.setItem(preferenceKey(PROFILE_STORAGE, subjectRef), profile)
  } catch {
    // Presentation still works for storage-restricted/private browsing sessions.
  }
}

export function getSavedCockpitAmbience(subjectRef?: string | null): CockpitAmbience {
  try {
    const value = window.localStorage.getItem(preferenceKey(AMBIENCE_STORAGE, subjectRef))
    return AMBIENCE_VALUES.has(value as CockpitAmbience) ? (value as CockpitAmbience) : 'neural'
  } catch {
    return 'neural'
  }
}

export function saveCockpitAmbience(ambience: CockpitAmbience, subjectRef?: string | null) {
  try {
    window.localStorage.setItem(preferenceKey(AMBIENCE_STORAGE, subjectRef), ambience)
  } catch {
    // Presentation still works for storage-restricted/private browsing sessions.
  }
}

export function legacyCockpitWorkspaceKey(
  deviceClass: CockpitDeviceClass,
  deviceKey: string,
  profile: CockpitProfile,
) {
  return `cockpit.v2.${deviceClass}.${deviceKey}.${profile}`
}

export function cockpitWorkspaceKey(
  deviceClass: CockpitDeviceClass,
  deviceKey: string,
  windowKey: string,
  profile: CockpitProfile,
) {
  return `cockpit.v3.${deviceClass}.${deviceKey}.${windowKey}.${profile}`
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
