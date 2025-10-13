export const store = {
  token: "" as string,
  email: "" as string,
  setToken(t: string) {
    this.token = t;
    localStorage.setItem("akirah_token", t);
  },
  load() {
    const t = localStorage.getItem("akirah_token");
    if (t) this.token = t;
  },
  clear() {
    this.token = "";
    localStorage.removeItem("akirah_token");
  },
};
