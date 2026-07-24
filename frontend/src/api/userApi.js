import API from "./axios";

export const getUserProfile = async () => {
  const res = await API.get("/users/profile");
  return res.data;
};

export const updateUserProfile = async (data) => {
  const res = await API.put("/users/profile", data);
  return res.data;
};

export const changePassword = async (data) => {
  const res = await API.put("/users/change-password", data);
  return res.data;
};

export const deleteAccount = async (currentPassword) => {
  const res = await API.post("/users/close-account", { currentPassword });
  return res.data;
};
