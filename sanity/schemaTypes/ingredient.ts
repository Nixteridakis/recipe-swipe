import { defineType, defineField } from 'sanity'
import { BasketIcon } from '@sanity/icons'

export const ingredient = defineType({
  name: 'ingredient',
  title: 'Ingredient',
  type: 'document',
  icon: BasketIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      options: {
        list: [
          { title: 'Produce', value: 'produce' },
          { title: 'Dairy', value: 'dairy' },
          { title: 'Meat & Seafood', value: 'meat-seafood' },
          { title: 'Pantry', value: 'pantry' },
          { title: 'Frozen', value: 'frozen' },
          { title: 'Bakery', value: 'bakery' },
          { title: 'Spices & Seasonings', value: 'spices' },
          { title: 'Oils & Vinegars', value: 'oils-vinegars' },
          { title: 'Beverages', value: 'beverages' },
          { title: 'Other', value: 'other' },
        ],
        layout: 'dropdown',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'defaultUnit',
      title: 'Default Unit',
      type: 'string',
      description: 'The most common unit for this ingredient',
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
      title: 'name',
      subtitle: 'category',
    },
  },
})

