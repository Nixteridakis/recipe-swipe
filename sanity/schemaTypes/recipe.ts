import { defineType, defineField, defineArrayMember } from 'sanity'
import { BookIcon } from '@sanity/icons'

export const recipe = defineType({
  name: 'recipe',
  title: 'Recipe',
  type: 'document',
  icon: BookIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'sourceUrl',
      title: 'Source URL',
      type: 'url',
      description: 'Original URL the recipe was imported from.',
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: 'servings',
      title: 'Servings',
      type: 'number',
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: 'prepTime',
      title: 'Prep Time (minutes)',
      type: 'number',
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: 'cookTime',
      title: 'Cook Time (minutes)',
      type: 'number',
      validation: (rule) => rule.min(0),
    }),
    defineField({
      name: 'ingredients',
      title: 'Ingredients',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'recipeIngredient',
          fields: [
            defineField({
              name: 'ingredient',
              title: 'Ingredient',
              type: 'reference',
              to: [{ type: 'ingredient' }],
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'quantity',
              title: 'Quantity',
              type: 'number',
              validation: (rule) => rule.required().min(0),
            }),
            defineField({
              name: 'unit',
              title: 'Unit',
              type: 'string',
              options: {
                list: [
                  { title: 'piece(s)', value: 'piece' },
                  { title: 'cup(s)', value: 'cup' },
                  { title: 'tablespoon(s)', value: 'tbsp' },
                  { title: 'teaspoon(s)', value: 'tsp' },
                  { title: 'gram(s)', value: 'g' },
                  { title: 'kilogram(s)', value: 'kg' },
                  { title: 'ounce(s)', value: 'oz' },
                  { title: 'pound(s)', value: 'lb' },
                  { title: 'milliliter(s)', value: 'ml' },
                  { title: 'liter(s)', value: 'l' },
                  { title: 'pinch', value: 'pinch' },
                  { title: 'clove(s)', value: 'clove' },
                  { title: 'bunch', value: 'bunch' },
                  { title: 'can(s)', value: 'can' },
                  { title: 'package', value: 'package' },
                ],
              },
            }),
          ],
          preview: {
            select: {
              ingredientName: 'ingredient.name',
              quantity: 'quantity',
              unit: 'unit',
            },
            prepare({ ingredientName, quantity, unit }) {
              return {
                title: ingredientName || 'Select ingredient',
                subtitle: quantity && unit ? `${quantity} ${unit}` : '',
              }
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'instructions',
      title: 'Instructions',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [{ title: 'Normal', value: 'normal' }],
          lists: [
            { title: 'Numbered', value: 'number' },
            { title: 'Bullet', value: 'bullet' },
          ],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [],
          },
        }),
      ],
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'category' }],
        }),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'image',
      servings: 'servings',
    },
    prepare({ title, media, servings }) {
      return {
        title,
        subtitle: servings ? `${servings} servings` : '',
        media,
      }
    },
  },
})

