import axios from "axios";

// Creating an instance for axios to be used by the token interceptor service
const api = axios.create({
  baseURL: `${import.meta.env.VITE_BE_API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
