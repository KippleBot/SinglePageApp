<script setup>
import { computed, reactive, ref } from 'vue'
import novaImage from '../Image_Characters/Nova.png'
import lunaImage from '../Image_Characters/Luna.png'
import stratixImage from '../Image_Characters/Stratix.png'
import quayzaImage from '../Image_Characters/Moth.png'
import voidexImage from '../Image_Characters/Voidex.png'
import titleImage from '../Image_Characters/logo.png'
import instagramIcon from '../CIS-A2K_Instagram_Icon_(Black).svg.webp'
import xIcon from '../X_icon.svg.webp'
import otherSocialIcon from '../4401475.png'
import previewImage from '../Image_Characters/image2.png'
const characters = [
  {
    name: 'Nova Stellar',
    description: 'Nova Stellar is a butterfly-like celestial who wishes to experience the world of the Astral Plane and wants to be as good as the others. She is less experienced than the others when it comes to having powers, yet she wishes to help others whenever she can.',
    image: novaImage
  },
  {
    name: 'Luna the Moonraddit',
    description: "Luna is a rabbit who was born into the Astral Plane. She is timid yet curious about the new world. Due to Voidex's mayhem, she is forced to help save the universe from falling apart.",
    image: lunaImage
  },
  {
    name: 'Stratix the Space Badger',
    description: "Stratix is one of the celestials' noble guardians: cold and calculated. He reluctantly helps Luna because his duty is more important than his own ego.",
    image: stratixImage
  },
  {
    name: 'Quayza',
    description: "Quayza is one of Voidex's followers and will do anything to ensure Voidex is happy. Once a guardian, he was cast out after revealing the secrets of the Astral Plane to Voidex, and now seeks revenge.",
    image: quayzaImage
  },
  {
    name: 'Voidex',
    description: 'Voidex wants to corrupt and destroy the realm he calls home. Believing the other celestials unworthy, he seeks to take their place, even if it means corrupting those he once enjoyed being around.',
    image: voidexImage
  }
]
// The following consts and functions are used to manage just about everything on the webpage.
//This includes the character display, the two forms, and the admin panel, which is used to manage the users.
const selectedCharacterIndex = ref(0)
const currentCharacter = computed(() => characters[selectedCharacterIndex.value])
const adminOpen = ref(false)
const registrationOpen = ref(false)
const submitting = ref(false)
const message = ref('')
const adminMessage = ref('')
const form = reactive({ username: '', email: '', password: '', age: null })
const adminForm = reactive({ username: '', email: '', password: '', adminID: '' })
const adminInfo = ref(null)
const users = ref([])
const loadingUsers = ref(false)
const editingUserId = ref(null)
const editForm = reactive({ username: '', email: '', age: null })
const selectedPreview = ref(0)
const previewCount = 5

// This is how I am able to change the characters and the descriptions, which is done via the dividing the direction, length of the characters const and value with the length of the characters const.
function moveCharacter(direction) {
  selectedCharacterIndex.value =
    (selectedCharacterIndex.value + direction + characters.length) % characters.length
}
// This function, which is exclusive to the scroll to top button, allows for easy access to the top of the page.
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  })
  // This checks if the response is connected to the database, if it is it'll return it, else it'll throw an error.
  //This has helped me figure out if the database is connected to the webpage or not.
  const result = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : null

  if (!response.ok) {
    throw new Error(result?.message || `Request failed (${response.status})`)
  }

  return result
}
// This is the function that allows the user to register.
async function register() {
  submitting.value = true
  message.value = ''
  try {
    const result = await apiRequest('/api/register', {
      method: 'POST',
      body: JSON.stringify(form)
    })
    message.value = result.message || 'Registration successful.'
    form.username = ''
    form.email = ''
    form.password = ''
    form.age = null
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Registration failed.'
  } finally {
    submitting.value = false
  }
}
// This is the function that allows the admin to log in. 
async function loginAsAdmin() {
  submitting.value = true
  adminMessage.value = ''
  try {
    const result = await apiRequest('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(adminForm)
    })
    adminInfo.value = result.admin
    adminMessage.value = 'Signed in successfully.'
    adminForm.password = ''
    await fetchUsers()
  } catch (error) {
    adminMessage.value = error instanceof Error ? error.message : 'Admin sign-in failed.'
  } finally {
    submitting.value = false
  }
}
// This grabs the users that have been grabbed and bring them into the panel, if nothing is there, it'll spawn an error
async function fetchUsers() {
  loadingUsers.value = true
  try {
    users.value = await apiRequest('/api/admin/users')
  } catch (error) {
    adminMessage.value = error instanceof Error ? error.message : 'Could not load users.'
  } finally {
    loadingUsers.value = false
  }
}

function startEditing(user) {
  editingUserId.value = user._id
  editForm.username = user.username
  editForm.email = user.email
  editForm.age = user.age ?? null
  adminMessage.value = ''
}
// This is where the Update system is, which allows the admin to change the users preferences and info.
// Although, this is just to show the Update function, as if this were to happen in real life, it would have to be used for the users side.
// Due to time constraints, I just had to go with the admin, so I could easily show the function.
async function saveUser(userId) {
  adminMessage.value = ''
  try {
    const updatedUser = await apiRequest(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify(editForm)
    })
    const index = users.value.findIndex(user => user._id === userId)
    if (index !== -1) users.value[index] = updatedUser
    editingUserId.value = null
    adminMessage.value = 'User updated.'
  } catch (error) {
    adminMessage.value = error instanceof Error ? error.message : 'Could not update user.'
  }
}
// this is the function that removes the user from the database. This would be used to remove users that could be used for testing or are bots.
async function deleteUser(userId) {
  if (!window.confirm('Delete this user? This cannot be undone.')) return
  adminMessage.value = ''
  try {
    await apiRequest(`/api/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' })
    users.value = users.value.filter(user => user._id !== userId)
    if (editingUserId.value === userId) editingUserId.value = null
    adminMessage.value = 'User deleted.'
  } catch (error) {
    adminMessage.value = error instanceof Error ? error.message : 'Could not delete user.'
  }
}
//This function using the apirequest, allows the admin to log out, which will clear the info and users.
async function logoutAdmin() {
  adminMessage.value = ''
  try {
    await apiRequest('/api/admin/logout', { method: 'POST' })
    adminInfo.value = null
    users.value = []
    editingUserId.value = null
    adminMessage.value = 'Signed out.'
  } catch (error) {
    adminMessage.value = error instanceof Error ? error.message : 'Could not sign out.'
  }
}
</script>
<!--The following template contains the entire webpage, which is divided into sections, so that it is easier to manage and change parts of the webpage as I like.
 Due to template using the majority of code, I'll be adding comments to the sections and parts of the template, where I find is appropriate. -->
<template>
  <main>
    <section id="section_1">
      <button id="myBtn" type="button" title="Go to top" aria-label="Go to top" @click="scrollToTop">↑</button>
      <div class="top-actions">
        <button type="button" class="button-secondary" @click="adminOpen = true">Admin sign in</button>
      </div>
      <Teleport to="body">
        <div
          v-if="adminOpen && !adminInfo"
          class="modal-backdrop"
          @click.self="adminOpen = false"
        >
        <!-- This section is where the admin can log in and once they are, they can manage the users that registered into this webpage and change whatever they like. -->
          <section id="Admin_Form" class="form-panel" role="dialog" aria-modal="true" aria-labelledby="admin-title">
            <h1 id="admin-title">Admin sign in</h1>
            <p class="form-intro">Sign in to manage registered users.</p>
            <form @submit.prevent="loginAsAdmin">
              <label for="admin-username">Username</label>
              <input id="admin-username" v-model="adminForm.username" autocomplete="username" required>
              <label for="admin-email">Email</label>
              <input id="admin-email" v-model="adminForm.email" type="email" autocomplete="email" required>
              <label for="admin-password">Password</label>
              <input id="admin-password" v-model="adminForm.password" type="password" autocomplete="current-password" required>
              <label for="admin-id">Admin ID</label>
              <input id="admin-id" v-model="adminForm.adminID" required>
              <div class="form-actions">
                <button type="submit" :disabled="submitting">{{ submitting ? 'Signing in…' : 'Sign in' }}</button>
                <button type="button" class="button-secondary" @click="adminOpen = false">Close</button>
              </div>
              <p v-if="adminMessage" role="status">{{ adminMessage }}</p>
            </form>
          </section>
        </div>
        <div
          v-else-if="adminOpen && adminInfo"
          class="modal-backdrop"
          @click.self="adminOpen = false"
        >
        <!--This is the panel where the admin can manage the users, and do whatever they like.-->
        <!--This can include change the user, delete and refresh whoever has been added to the database.-->
          <section id="Admin_Form" class="form-panel admin-panel" role="dialog" aria-modal="true" aria-labelledby="users-title">
            <div class="admin-heading">
              <div>
                <h1 id="users-title">User management</h1>
                <p>Signed in as {{ adminInfo.username }} · Admin ID: {{ adminInfo.adminID }}</p>
              </div>
              <button type="button" class="button-secondary" @click="logoutAdmin">Sign out</button>
            </div>
            <div class="admin-actions">
              <h2>Registered users</h2>
              <button type="button" :disabled="loadingUsers" @click="fetchUsers">
                {{ loadingUsers ? 'Loading…' : 'Refresh list' }}
              </button>
            </div>
            <!-- Vue uses a different approach for conditional, by using v-if, v-else-if and v-else instead of the usual if, else and elif/else if-->
            <p v-if="adminMessage" role="status">{{ adminMessage }}</p>
            <p v-if="loadingUsers">Loading users…</p>
            <p v-else-if="users.length === 0">No registered users.</p>
            <div v-else class="user-list">
              <article v-for="user in users" :key="user._id" class="user-card">
                <p><strong>User ID:</strong> {{ user._id }}</p>
                <template v-if="editingUserId === user._id">
                  <label :for="`username-${user._id}`">Username</label>
                  <input :id="`username-${user._id}`" v-model.trim="editForm.username" required>
                  <label :for="`email-${user._id}`">Email</label>
                  <input :id="`email-${user._id}`" v-model.trim="editForm.email" type="email" required>
                  <label :for="`age-${user._id}`">Age</label>
                  <input :id="`age-${user._id}`" v-model.number="editForm.age" type="number" min="0" max="100">
                  <div class="form-actions">
                    <!-- @click is essential for making the buttons functional. These are useful for handling the type of webpage I am working on.-->
                    <button type="button" @click="saveUser(user._id)">Save</button>
                    <button type="button" class="button-secondary" @click="editingUserId = null">Cancel</button>
                  </div>
                </template>
                <template v-else>
                  <p><strong>Username:</strong> {{ user.username }}</p>
                  <p><strong>Email:</strong> {{ user.email }}</p>
                  <p><strong>Age:</strong> {{ user.age ?? 'Not provided' }}</p>
                  <div class="form-actions">
                    <button type="button" @click="startEditing(user)">Edit</button>
                    <button type="button" class="button-danger" @click="deleteUser(user._id)">Delete</button>
                  </div>
                </template>
              </article>
            </div>
            <button type="button" class="button-secondary" @click="adminOpen = false">Close</button>
          </section>
        </div>
      </Teleport>

      <img :src="titleImage" size="contain" width="75%" height="auto" class="title_image" alt="Astral Plane">
      <div class="social_buttons" aria-label="Social media">
        <button class="social_button" type="button" aria-label="Instagram"><img :src="instagramIcon" alt=""></button>
        <button class="social_button" type="button" aria-label="X"><img :src="xIcon" alt=""></button>
        <button class="social_button" type="button" aria-label="Social link"><img :src="otherSocialIcon" alt=""></button>
      </div>
    </section>
<!-- This section displays the characters and their descriptions.  -->
    <section id="section_2" aria-label="Characters">
      <div id="image_section">
        <img :src="currentCharacter.image" :alt="currentCharacter.name" id="side">
      </div>
      <div id="section_breaker">
        <h2>{{ currentCharacter.name }}</h2>
        <p id="paragraph">{{ currentCharacter.description }}</p>
        </div>
        <div class="section_buttons">
          <button type="button" aria-label="Previous character" @click="moveCharacter(-1)">←</button>
          <button type="button" aria-label="Next character" @click="moveCharacter(1)">→</button>
        </div>
    </section>
<!-- This section displays the game preview. -->
    <section id="section_3" aria-label="Game preview">
      
      <button type="button" aria-label="Previous preview" @click="selectedPreview = (selectedPreview + previewCount - 1) % previewCount">←</button>
      <img :src="previewImage" id="main" alt="Game preview placeholder">
      <button type="button" aria-label="Next preview" @click="selectedPreview = (selectedPreview + 1) % previewCount">→</button>
      <div class="preview-indicators">
        <button
          v-for="preview in previewCount"
          :key="preview"
          type="button"
          :aria-pressed="selectedPreview === preview - 1"
          :class="{ active: selectedPreview === preview - 1 }"
          @click="selectedPreview = preview - 1"
        >{{ preview }}</button>
      </div>
    </section>

    <section id="registration_section">
      <button type="button" class="button-primary" @click="registrationOpen = true">Register</button>
    </section>
<!-- This section contains the registration form.  the "Teleport to "body"" makes it so that it appears over the content so that it stands out more and doesn't mess with the content of the web page-->
    <Teleport to="body">
      <div
        v-if="registrationOpen"
        class="modal-backdrop"
        @click.self="registrationOpen = false"
      >
        <section id="Registration_Form" class="form-panel" role="dialog" aria-modal="true" aria-labelledby="registration-title">
          <h1 id="registration-title">Join the Astral Plane</h1>
          <p class="form-intro">Register for exclusive rewards and events.</p>
          <form @submit.prevent="register">
            <label for="username">Username</label>
            <!-- This code right here is how I make the input fields work.-->
            <input id="username" v-model.trim="form.username" autocomplete="username" required>
            <label for="email">Email</label>
            <input id="email" v-model.trim="form.email" type="email" autocomplete="email" required>
            <label for="password">Password</label>
            <input id="password" v-model="form.password" type="password" autocomplete="new-password" minlength="8" required>
            <label for="age">Age</label>
            <input id="age" v-model.number="form.age" type="number" min="0" max="100">
            <div class="form-actions">
              <button type="submit" :disabled="submitting">{{ submitting ? 'Submitting…' : 'Create account' }}</button>
              <button type="button" class="button-secondary" @click="registrationOpen = false">Close</button>
            </div>
            <p v-if="message" role="status">{{ message }}</p>
          </form>
        </section>
      </div>
    </Teleport>
<!-- This footer contains site information and links. 
 The link buttons like the link buttons on the top of the page will not be doing much due to time constraints and not wanting to make three random accounts on the websites, but are there just to be a bit believable as a webpage-->
    <footer id="section_5">
      <div id="section_for_links">
        <h2>About Us</h2>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        <nav aria-label="Footer">
          <a href="#terms">Terms and Conditions</a>
          <span aria-hidden="true"> | </span>
          <a href="#privacy">Privacy Policy</a>
          <span aria-hidden="true"> | </span>
          <a href="mailto:contact@example.com">Contact Us</a>
        </nav>
        <div class="social_buttons" aria-label="Social media">
          <button class="social_button" type="button" aria-label="Instagram"><img :src="instagramIcon" alt=""></button>
          <button class="social_button" type="button" aria-label="X"><img :src="xIcon" alt=""></button>
          <button class="social_button" type="button" aria-label="Social link"><img :src="otherSocialIcon" alt=""></button>
        </div>
      </div>
    </footer>
  </main>
</template>
