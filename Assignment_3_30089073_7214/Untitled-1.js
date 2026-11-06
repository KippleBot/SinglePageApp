// stores/itemStore.js
import { defineStore } from 'pinia'
import axios from 'axios'

const API_URL = 'https://example.com'

export const useItemStore = defineStore('itemStore', {
  state: () => ({
    items: [],
    loading: false,
    error: null
  }),
  
  actions: {
    // READ: Get all items
    async fetchItems() {
      this.loading = true
      try {
        const response = await axios.get(API_URL)
        this.items = response.data
      } catch (err) {
        this.error = 'Failed to get account'
      } finally {
        this.loading = false
      }
    },

    // CREATE: Add a new item
    async addItem(newItem) {
      try {
        const response = await axios.post(API_URL, newItem)
        this.items.push(response.data)
      } catch (err) {
        this.error = 'Failed to add item'
      }
    },

    // UPDATE: Modify an existing item
    async updateItem(id, updatedItem) {
      try {
        const response = await axios.put(`${API_URL}/${id}`, updatedItem)
        const index = this.items.findIndex(item => item.id === id)
        if (index !== -1) this.items[index] = response.data
      } catch (err) {
        this.error = 'Failed to update item'
      }
    },

    // DELETE: Remove an item
    async deleteItem(id) {
      try {
        await axios.delete(`${API_URL}/${id}`)
        this.items = this.items.filter(item => item.id !== id)
      } catch (err) {
        this.error = 'Failed to delete item'
      }
    }
  }
})
