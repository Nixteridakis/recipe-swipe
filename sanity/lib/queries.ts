import { defineQuery } from 'next-sanity'

// Get all recipes for the grid (minimal data)
export const recipesQuery = defineQuery(`
  *[_type == "recipe"] | order(_createdAt desc) {
    _id,
    title,
    slug,
    description,
    image,
    servings,
    prepTime,
    cookTime,
    "categories": categories[]->{ _id, name, slug }
  }
`)

// Get a single recipe by slug (full data)
export const recipeBySlugQuery = defineQuery(`
  *[_type == "recipe" && slug.current == $slug][0] {
    _id,
    title,
    slug,
    description,
    sourceUrl,
    image,
    servings,
    prepTime,
    cookTime,
    "ingredients": ingredients[] {
      _key,
      quantity,
      unit,
      "ingredient": ingredient-> {
        _id,
        name,
        category,
        defaultUnit
      }
    },
    instructions,
    "categories": categories[]->{ _id, name, slug }
  }
`)

// Get multiple recipes by IDs (for shopping list)
export const recipesByIdsQuery = defineQuery(`
  *[_type == "recipe" && _id in $ids] {
    _id,
    title,
    servings,
    "ingredients": ingredients[] {
      _key,
      quantity,
      unit,
      "ingredient": ingredient-> {
        _id,
        name,
        category
      }
    }
  }
`)

// Get all categories
export const categoriesQuery = defineQuery(`
  *[_type == "category"] | order(name asc) {
    _id,
    name,
    slug,
    image
  }
`)

// Categories with recipe previews for Discover swipe UI
export const discoverCategoriesQuery = defineQuery(`
  *[_type == "category"] | order(name asc) {
    _id,
    name,
    slug,
    "recipeCount": count(*[_type == "recipe" && references(^._id)]),
    "previewRecipe": *[_type == "recipe" && references(^._id)] | order(_createdAt desc)[0] {
      _id,
      title,
      slug,
      description,
      image,
      prepTime
    }
  }
`)

// Get all ingredients (for reference/autocomplete)
export const ingredientsQuery = defineQuery(`
  *[_type == "ingredient"] | order(name asc) {
    _id,
    name,
    category,
    defaultUnit
  }
`)

