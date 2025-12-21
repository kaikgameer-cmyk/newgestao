// Utilitários de formatação e detecção de tipo de chave PIX

export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random" | "";

export const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  return numbers
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};

export const formatCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, "").slice(0, 14);
  return numbers
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
};

export const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return numbers
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};

export const formatPixKey = (value: string, type: PixKeyType): string => {
  switch (type) {
    case "cpf":
      return formatCPF(value);
    case "cnpj":
      return formatCNPJ(value);
    case "phone":
      return formatPhone(value);
    case "email":
    case "random":
    case "":
    default:
      return value;
  }
};

export const unmaskPixKey = (value: string): string => {
  return value.replace(/[.\-/()\s]/g, "");
};

// Heurística simples para detectar tipo de chave com base no que o usuário digitou
export const detectPixType = (rawValue: string): PixKeyType => {
  const value = rawValue.trim();
  const digits = value.replace(/\D/g, "");

  if (!value) return "";

  // E-mail
  if (value.includes("@") && value.includes(".")) {
    return "email";
  }

  // Telefone: presença de +, parênteses ou comprimento típico de celular
  if (/[+()]/.test(value) || (digits.length === 10 || digits.length === 11)) {
    return "phone";
  }

  // CPF / CNPJ por quantidade de dígitos
  if (digits.length === 11) {
    return "cpf";
  }

  if (digits.length === 14) {
    return "cnpj";
  }

  // Qualquer outra coisa tratamos como chave aleatória
  return "random";
};
