import { useState, useCallback } from "react";

// ─── Validators ───────────────────────────────────────────────────────────────

const validators = {
  name: (value) => {
    if (!value?.trim()) return "Name is required";
    if (value.trim().length < 2) return "Name must be at least 2 characters";
    if (value.trim().length > 50) return "Name cannot exceed 50 characters";
    return null;
  },

  email: (value) => {
    if (!value?.trim()) return "Email is required";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(value.trim())) return "Please enter a valid email address";
    return null;
  },

  password: (value) => {
    if (!value) return "Password is required";
    if (value.length < 6) return "Password must be at least 6 characters";
    return null;
  },

  confirmPassword: (value, formValues) => {
    if (!value) return "Please confirm your password";
    if (value !== formValues.password) return "Passwords do not match";
    return null;
  },
};

// ─── Password strength calculator ────────────────────────────────────────────

export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: "", color: "" };

  let score = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    long: password.length >= 12,
  };

  score += checks.length ? 1 : 0;
  score += checks.uppercase ? 1 : 0;
  score += checks.number ? 1 : 0;
  score += checks.special ? 1 : 0;
  score += checks.long ? 1 : 0;

  const levels = [
    { min: 0, max: 1, label: "Very weak", color: "#f87171" },
    { min: 2, max: 2, label: "Weak", color: "#fb923c" },
    { min: 3, max: 3, label: "Fair", color: "#facc15" },
    { min: 4, max: 4, label: "Strong", color: "#4ade80" },
    { min: 5, max: 5, label: "Very strong", color: "#10b981" },
  ];

  const level =
    levels.find((l) => score >= l.min && score <= l.max) || levels[0];
  return { score, label: level.label, color: level.color, checks };
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useAuthForm = (fields, validateOnChange = false) => {
  const [values, setValues] = useState(
    Object.fromEntries(fields.map((f) => [f, ""])),
  );
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  //   const validate = useCallback(
  //     (fieldName, allValues) => {
  //       const validator = validators[fieldName];
  //       if (!validator) return null;
  //       return validator(
  //         allValues[fieldName] ?? values[fieldName],
  //         allValues ?? values,
  //       );
  //     },
  //     [values],
  //   );

  const validateAll = useCallback(() => {
    const newErrors = {};
    for (const field of fields) {
      const error = validators[field]?.(values[field], values);
      if (error) newErrors[field] = error;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [fields, values]);

  const handleChange = useCallback(
    (field) => (e) => {
      const value = e.target.value;
      setValues((prev) => {
        const next = { ...prev, [field]: value };
        if (validateOnChange && touched[field]) {
          const error = validators[field]?.(value, next);
          setErrors((prevErrors) => ({
            ...prevErrors,
            [field]: error || undefined,
          }));
        }
        return next;
      });
    },
    [validateOnChange, touched],
  );

  const handleBlur = useCallback(
    (field) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const error = validators[field]?.(values[field], values);
      setErrors((prev) => ({ ...prev, [field]: error || undefined }));
    },
    [values],
  );

  const clearErrors = useCallback(() => setErrors({}), []);

  const setFieldError = useCallback((field, error) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  const reset = useCallback(() => {
    setValues(Object.fromEntries(fields.map((f) => [f, ""])));
    setErrors({});
    setTouched({});
  }, [fields]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    clearErrors,
    setFieldError,
    reset,
  };
};

export default useAuthForm;
