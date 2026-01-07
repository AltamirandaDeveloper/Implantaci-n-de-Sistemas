import { z } from 'zod'

export const createContentSchema = z.object({
  titulo: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  grado_objetivo: z.preprocess((v) => {
    // A veces viene como string desde el select
    if (typeof v === 'string' && v.trim() !== '') return Number(v)
    return v
  }, z.number().int().positive('Seleccione un grado válido')),
})

export const updateContentSchema = createContentSchema

export default createContentSchema
