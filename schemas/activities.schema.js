import { z } from 'zod'

const validTipos = ['tarea', 'ensayo', 'lectura', 'practica', 'quiz']

export const activitySchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  instrucciones: z.string().min(10, 'Las instrucciones deben tener al menos 10 caracteres'),
  tipo: z.enum(validTipos, 'Seleccione un tipo válido'),
  fecha_vencimiento: z.preprocess((v) => {
    if (typeof v === 'string' && v.trim() !== '') return new Date(v)
    return v
  }, z.date({ required_error: 'Fecha de vencimiento requerida' }).refine(d => !isNaN(d.getTime()), { message: 'Fecha inválida' }).refine(d => d >= new Date(new Date().setHours(0,0,0,0)), { message: 'La fecha debe ser hoy o futura' })),
  id_contenido: z.preprocess((v) => {
    if (typeof v === 'string' && v.trim() !== '') return Number(v)
    return v
  }, z.number().int().positive('Seleccione un contenido válido')),
})

export default activitySchema
