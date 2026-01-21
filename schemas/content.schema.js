import { z } from 'zod'

// 1. Definimos cómo se ve un solo enlace
const enlaceSchema = z.object({
  titulo: z.string().optional(),
  // Validamos que sea una URL real (https://...)
  url: z.string().url('Debe ser una URL válida (ej: https://google.com)')
})

export const createContentSchema = z.object({
  titulo: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  descripcion: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  
  grado_objetivo: z.preprocess((v) => {
    if (typeof v === 'string' && v.trim() !== '') return Number(v)
    return v
  }, z.number().int().positive('Seleccione un grado válido')),

  // 2. AÑADIMOS EL ARRAY DE ENLACES (Opcional)
  enlaces_relacionados: z.array(enlaceSchema).optional().default([]) 
})

// Para actualizar, usamos el mismo (o podrías usar .partial() si quisieras hacer updates parciales)
export const updateContentSchema = createContentSchema

export default createContentSchema