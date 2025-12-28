import { type SchemaTypeDefinition } from 'sanity'
import { ingredient } from './ingredient'
import { category } from './category'
import { recipe } from './recipe'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [ingredient, category, recipe],
}
