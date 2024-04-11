<script>
import api from '@services/api';

export default {
  data() {
    return {
      loading: false,
      blogLink: import.meta.env.VITE_BLOG_LINK,
    };
  },
  created() {},
  methods: {
    async postData() {
      this.loading = true;
      try {
        const res = [];
        res.push((await api.post('/countries',{ name: 'IT_1'})).data);
        res.push((await api.post('/countries',{ name: 'UK_2'})).data);
        res.push((await api.post('/publishers',{ name: 'Publisher 1', country_id: 1})).data);
        res.push((await api.post('/publishers',{ name: 'Publisher 2', country_id: 2})).data);
        res.push((await api.post('/countries',{ name: 'US_3', publishers: [{ name: 'Pub 3',},{ name: 'Pub 4',}, ],}) ).data);
        res.push((await api.post('/authors',{ first_name: 'Nome 1', last_name: 'Cognome 1', registry:{ address: 'Addr 1', phone: '11111',}, books: [{ title: 'Book 1', publisher_id: 1},{ title: 'Book 2', publisher_id: 2}, ],}) ).data);
        res.push((await api.post('/authors',{ first_name: 'Nome 2', last_name: 'Cognome 2', registry:{ address: 'Address 2', phone: '2222222',}, books: [{ title: 'Book 3', publisher_id: 3},{ title: 'Book 4', publisher_id: 4}, ],}) ).data);
        res.push((await api.post('/books',{ "title": "Book 5", "publisher":{ "name": "Publisher 5", "country_id": 1}, "authors": [ 1,{ "id": 2},{ "first_name":"Nome 3", "last_name":"Cognome 3"} ]})).data);
        res.push((await api.post('/registries',{ "address": "Address 3", "phone": "333333333", "author_id": 3 })).data);
        res.push((await api.post('/books',{ "title": "Book 6", "publisher":{ "name": "Publisher 6", "country_id": 1}, "authors": [1,2]})).data);
        res.push((await api.post('/publishers',{"name": "Publisher 7","books": [1,{ "id": 2},{ "title": "Book 7"}],"country":{ "name": "JP_4"}})).data);
        res.push((await api.post('/registries',{ "address": "Addr 4", "phone": "4444444", "author":{ "first_name": "Nome 4", "last_name": "Cognome 4"}})).data);
        // res.push((await api.post('/',{})).data);
        this.responseData = JSON.stringify(res, null, 4);
        this.loading = false;
        return;
      } catch (error) {
        this.loading = false;
        console.error(error);
        return;
      }
    },
    async getAuthors() {
      this.loading = true;
      try {
        const res = []
        res.push({countries: (await api.get('/countries')).data});
        res.push({registries: (await api.get('/registries')).data});
        res.push({publishers: (await api.get('/publishers')).data});
        res.push({authors: (await api.get('/authors')).data});
        res.push({books: (await api.get('/books')).data});
        this.responseData = JSON.stringify(res, null, 4);
        this.loading = false;
        return;
      } catch (error) {
        this.loading = false;
        console.error(error);
        return;
      }
    },
    async validateUser() {
      this.loading = true;

      try {
        const apiURL = '/keycloak/validate-token';
        const res = await api.post(apiURL);
        console.log(res.data);

        this.loading = false;
        return;
      } catch (error) {
        this.loading = false;
        console.error(error);
        return;
      }
    },
  },
};
</script>

<template>
  <div>
    <a href="https://vitejs.dev" target="_blank">
      <img src="@/assets/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="@/assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
    <a href="https://http://git.si.cnr.it/gianluca.troiani/vamp/" target="_blank">
      <img src="@/assets/presto-p.svg" class="logo presto" alt="Presto logo" />
    </a>
  </div>

  <p class="read-the-docs">This project is for a tutorial on how to use Keycloak authentication with Vue 3 + Pinia + Node.</p>
  <p class="read-the-docs">
    Go to this
    <a :href="blogLink" target="_blank"> link </a>
    for the full tutorial.
  </p>

  <div class="card">
    <!-- Test Pinia persisted state button -->
    <button class="mr-15" type="button" title="Test persisted state" @click="$store.testAction">Test ({{ $store.test }})</button>

    <!-- Refresh token button -->
    <button class="mr-15" type="button" title="Refreshes user token" @click="$store.refreshUserToken">Refresh Token</button>

    <!-- BE validation button -->
    <button class="mr-15" type="button" title="Write test data" :disabled="loading" @click="postData">Post Validation</button>

    <button class="mr-15" type="button" title="Check Console with Dev Tools" :disabled="loading" @click="getAuthors">
      Backend Validation
    </button>

    <!-- Logout button -->
    <button type="button" title="Logout Keycloak user" @click="$store.logout">Logout</button>
  </div>
  <div class="card py-10">
    <pre id="response-data">{{ responseData }}</pre>
    <h2>Keycloak User</h2>
    <p class="my-5">Username: {{ $store.user.username }}</p>
    <p class="my-5">Token:</p>
    <pre>{{ $store.user.token }}</pre>
    <p class="my-5">Refresh Token:</p>
    <pre>{{ $store.user.refToken }}</pre>
  </div>
</template>

<style scoped>
pre {
  text-align: left;
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: #333;
  color: #cf9;
  padding: 1em;
  border-radius: 0.5rem;
  min-height: 3rem;
  max-height: 50vh;
  overflow: auto;
}
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}

.read-the-docs {
  color: #888;
}

.my-5 {
  margin-top: 5px;
  margin-bottom: 5px;
}

.mr-15 {
  margin-right: 15px;
}

.py-10 {
  padding-top: 10px;
  padding-bottom: 10px;
}

.wrap-text {
  word-wrap: break-word;
}

.font-small {
  font-size: 10px;
}
</style>
