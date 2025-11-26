import {
  type AdministrativoPayload,
  type DocentePayload,
  type EstudiantePayload,
  type UsuarioRole
} from "./usuariosService";
import type { UsuarioFormValues } from "./types";

interface ValidationResult {
  errors: string[];
}

const isEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const parseNumero = (value: string): number | null => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const validateUsuarioForm = (
  role: UsuarioRole,
  values: UsuarioFormValues,
  isEdit: boolean
): ValidationResult => {
  const errors: string[] = [];

  if (!values.nombre.trim()) {
    errors.push("El nombre es obligatorio.");
  }
  if (!values.apellido.trim()) {
    errors.push("El apellido es obligatorio.");
  }
  if (!values.idTipoDoc) {
    errors.push("Selecciona un tipo de documento.");
  }
  if (!values.numDoc.trim()) {
    errors.push("El numero de documento es obligatorio.");
  }
  if (!values.correo.trim()) {
    errors.push("El correo institucional es obligatorio.");
  } else if (!isEmail(values.correo)) {
    errors.push("Ingresa un correo valido.");
  }

  if (!isEdit && !values.password.trim()) {
    errors.push("La contraseña es obligatoria para nuevos usuarios.");
  }

  if (values.password && values.password.length > 0 && values.password.length < 6) {
    errors.push("La contraseña debe tener al menos 6 caracteres.");
  }

  if (role === "estudiante") {
    if (!values.idEscuela) {
      errors.push("Selecciona una escuela para el estudiante.");
    }
    if (!values.codigoGenerico.trim()) {
      errors.push("Ingresa el codigo del estudiante.");
    }
  }

  if (role === "docente") {
    if (!values.codigoGenerico.trim()) {
      errors.push("Ingresa el codigo del docente.");
    }
    if (!values.tipoContrato.trim()) {
      errors.push("Selecciona el tipo de contrato.");
    }
  }

  if (role === "administrativo") {
    if (!values.turno.trim()) {
      errors.push("Selecciona el turno de trabajo.");
    }
    if (!values.idRol) {
      errors.push("Selecciona el rol del administrativo.");
    }
  }

  return { errors };
};

const generoToBoolean = (value: UsuarioFormValues["genero"]): boolean | null => {
  if (value === "M") {
    return true;
  }
  if (value === "F") {
    return false;
  }
  return null;
};

export const buildPayloadFromValues = (
  role: UsuarioRole,
  values: UsuarioFormValues
): EstudiantePayload | DocentePayload | AdministrativoPayload => {
  const idTipoDoc = parseNumero(values.idTipoDoc);
  if (idTipoDoc == null) {
    throw new Error("Tipo de documento invalido");
  }

  const base = {
    nombre: values.nombre.trim(),
    apellido: values.apellido.trim(),
    idTipoDoc,
    numDoc: values.numDoc.trim(),
    celular: values.celular.trim() || undefined,
    genero: generoToBoolean(values.genero),
    correo: values.correo.trim(),
    password: values.password.trim() || undefined
  };

  switch (role) {
    case "estudiante": {
      const idEscuela = parseNumero(values.idEscuela);
      if (idEscuela == null) {
        throw new Error("Selecciona una escuela valida.");
      }
      const payload: EstudiantePayload = {
        ...base,
        idEscuela,
        codigo: values.codigoGenerico.trim()
      };
      return payload;
    }
    case "docente": {
      const idEscuela = values.idEscuela ? parseNumero(values.idEscuela) : null;
      const payload: DocentePayload = {
        ...base,
        idEscuela,
        codigoDocente: values.codigoGenerico.trim(),
        tipoContrato: values.tipoContrato.trim(),
        especialidad: values.especialidad.trim() || undefined
      };
      return payload;
    }
    case "administrativo": {
      const idRol = parseNumero(values.idRol);
      if (idRol == null) {
        throw new Error("Selecciona un rol valido.");
      }
      let idEscuela: number | null = null;
      if (values.idEscuela) {
        const parsedEscuela = parseNumero(values.idEscuela);
        if (parsedEscuela == null) {
          throw new Error("Selecciona una escuela valida.");
        }
        idEscuela = parsedEscuela;
      }
      const payload: AdministrativoPayload = {
        ...base,
        idEscuela,
        turno: values.turno.trim(),
        extension: values.extension.trim() || undefined,
        idRol
      };
      return payload;
    }
    default:
      throw new Error("Rol no soportado");
  }
};