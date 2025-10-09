export const db = {
  collection: () => ({
    doc: () => ({
      set: async (data) => console.log("Mock set:", data),
      get: async () => ({ exists: true, data: () => ({ pseudo: "TestUser" }) })
    })
  })
};

export const auth = {
  createUserWithEmailAndPassword: async (email, pass) => {
    console.log("Mock signup:", email, pass);
    return { user: { uid: "123", email } };
  },
  signInWithEmailAndPassword: async (email, pass) => {
    console.log("Mock login:", email, pass);
    return { user: { uid: "123", email } };
  }
};
