import { z } from 'zod';

// Regex para validación de números telefónicos en Venezuela
const venezuelaPhoneRegex = /^(?:(?:\+58|0058))?(?:0)?(212|234|235|238|239|240|241|242|243|244|245|246|247|248|249|251|252|253|254|255|256|257|258|259|261|262|263|264|265|266|267|268|269|271|272|273|274|275|276|277|278|279|281|282|283|284|285|286|287|288|289|291|292|293|294|295|412|414|416|424|426)\d{7}$/;

export const createUserSchema = z.object({
  nombre: z
    .string()
    .min(3, 'El nombre es obligatorio y debe tener al menos 3 caracteres'),
  apellido: z
    .string()
    .min(3, 'El apellido es obligatorio y debe tener al menos 3 caracteres'),
  cedula: z
    .string()
    .min(7, 'La cédula debe tener al menos 7 caracteres')
    .max(10, 'La cédula no debe tener más de 10 caracteres'),
  telefono: z
    .string()
    .regex(venezuelaPhoneRegex, 'Debe ser un número telefónico válido (ej: 02761234567, 04121234567)'),
  email: z
    .string()
    .email('El correo debe ser válido (no se permiten caracteres especiales como "Ñ" o acentos)'),
  password: z
    .string()
    .min(6, 'La contraseña es obligatoria y debe tener al menos 6 caracteres'),
  id_role: z
    .union([z.string(), z.number()])
    .refine((val) => String(val).length > 0, {
      message: 'Debe seleccionar un rol',
    }),
  // Validamos que el array de grados no esté vacío
  grados: z
    .array(z.number())
    .min(1, 'Debe seleccionar al menos un grado'),
});

// Para actualizar, hacemos los campos opcionales excepto quizás el ID
export const updateUserSchema = createUserSchema.partial().extend({
  // Si en el update la contraseña es opcional, lo manejamos así:
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional().or(z.literal('')),
});