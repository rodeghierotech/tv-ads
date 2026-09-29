import { z } from "zod";

export const idSchema = z.string().uuid("Identificador inválido.");
export const nameSchema = z.string().trim().min(1, "Informe um nome.").max(100, "Use até 100 caracteres.");

export function isExactItemOrder(existingIds: string[], orderedIds: string[]) {
  const expected = new Set(existingIds);
  return orderedIds.length === existingIds.length && new Set(orderedIds).size === orderedIds.length &&
    orderedIds.every((id) => expected.has(id));
}
