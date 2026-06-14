/** Hash e verificação de senha (bcrypt — puro JS, seguro no serverless). */
import bcrypt from 'bcryptjs';

const ROUNDS = 10;

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, ROUNDS);
}

export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash);
}

/** Validação simples de força. Retorna erro (string) ou null se ok. */
export function validarSenha(senha: string): string | null {
  if (senha.length < 8) return 'A senha precisa de pelo menos 8 caracteres.';
  if (!/[a-zA-Z]/.test(senha) || !/[0-9]/.test(senha)) {
    return 'Use letras e números na senha.';
  }
  return null;
}
