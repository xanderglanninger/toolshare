export interface SAIdValidationResult {
  valid: boolean;
  error?: string;
  dob?: Date;
  gender?: "male" | "female";
  citizenship?: "citizen" | "permanent_resident";
}

export function validateSAId(idNumber: string): SAIdValidationResult {
  if (!/^\d{13}$/.test(idNumber)) {
    return { valid: false, error: "ID number must be exactly 13 digits." };
  }

  // Extract date of birth: YYMMDD
  const year  = parseInt(idNumber.substring(0, 2), 10);
  const month = parseInt(idNumber.substring(2, 4), 10);
  const day   = parseInt(idNumber.substring(4, 6), 10);

  const currentYear = new Date().getFullYear() % 100;
  const fullYear = year <= currentYear ? 2000 + year : 1900 + year;

  if (month < 1 || month > 12) {
    return { valid: false, error: "ID number contains an invalid birth month." };
  }
  const dob = new Date(fullYear, month - 1, day);
  if (
    dob.getFullYear() !== fullYear ||
    dob.getMonth() !== month - 1 ||
    dob.getDate() !== day
  ) {
    return { valid: false, error: "ID number contains an invalid birth date." };
  }

  if (dob > new Date()) {
    return { valid: false, error: "ID number birth date is in the future." };
  }

  const ageMs = Date.now() - dob.getTime();
  const age = ageMs / (1000 * 60 * 60 * 24 * 365.25);
  if (age < 16) {
    return { valid: false, error: "You must be at least 16 years old to register." };
  }

  // Gender: 0000–4999 = female, 5000–9999 = male
  const genderDigits = parseInt(idNumber.substring(6, 10), 10);
  const gender = genderDigits >= 5000 ? "male" : "female";

  // Citizenship: digit 10 — 0 = SA citizen, 1 = permanent resident
  const citizenshipDigit = parseInt(idNumber[10], 10);
  if (citizenshipDigit !== 0 && citizenshipDigit !== 1) {
    return { valid: false, error: "ID number has an invalid citizenship digit." };
  }
  const citizenship = citizenshipDigit === 0 ? "citizen" : "permanent_resident";

  // Luhn checksum
  if (!luhnCheck(idNumber)) {
    return { valid: false, error: "ID number checksum is invalid. Please double-check the number." };
  }

  return { valid: true, dob, gender, citizenship };
}

function luhnCheck(idNumber: string): boolean {
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    const digit = parseInt(idNumber[i], 10);
    if (i % 2 === 0) {
      sum += digit;
    } else {
      const doubled = digit * 2;
      sum += doubled > 9 ? doubled - 9 : doubled;
    }
  }
  return sum % 10 === 0;
}
