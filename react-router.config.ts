import fs from 'node:fs'
import type { Config } from '@react-router/dev/config'
import type { DbClass, DbClassSkill, DbEquipment } from './src/domain'
import { locales, localizedPath, slugify } from './src/paths'

const read = <T>(name: string): T =>
  JSON.parse(fs.readFileSync(new URL(`./public/data/${name}.json`, import.meta.url), 'utf8')) as T

const pages = ['', 'classes', 'mechanics', 'items', 'builds', 'gambling', 'spells', 'phases']
const equipment = read<DbEquipment[]>('equipment')
const skills = read<DbClassSkill[]>('class-skills')
const classes = read<DbClass[]>('classes')
const entityPaths = [
  ...new Set(
    equipment
      .filter(
        (item) =>
          item.category !== 'pet' && (item.rarity === 'unique' || item.rarity === 'legendary'),
      )
      .map((item) => `items/${item.familyId}`),
  ),
  ...skills.map((skill) => `classes/${skill.classId}/skills/${slugify(skill.name.en)}`),
  ...classes.map((hero) => `classes/${hero.id}`),
]

export default {
  appDirectory: 'src',
  basename: '/tl2-wiki/',
  buildDirectory: 'build',
  routeDiscovery: { mode: 'initial' },
  ssr: false,
  prerender: {
    paths: locales.flatMap((lang) =>
      [...pages, ...entityPaths].map((path) => {
        const localized = localizedPath(lang, path)
        return localized === '/' ? localized : localized.slice(0, -1)
      }),
    ),
    concurrency: 4,
  },
} satisfies Config
