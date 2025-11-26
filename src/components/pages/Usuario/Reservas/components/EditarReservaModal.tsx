import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, Loader2, Save, Users, X } from 'lucide-react';
import type { ReservaApi } from '../types';
import { updateReserva } from '../services/reservasService';
import { getReservasApiUrl } from '../../../../../utils/apiConfig';
import '../../../../../styles/ReservaModal.css';

// =====================================
// PROPS CORRECTAS (la parte que rompía todo)
// =====================================
interface EditarReservaModalProps {
  reserva: ReservaApi | null;
  open: boolean;
  onClose: () => void;
  onReservaActualizada?: (reserva: ReservaApi) => void;
}

// =====================================
// TYPES INTERNOS
// =====================================
interface ReservaFormState {
  fechaReserva: string;
  bloqueId: string;
  cursoId: string;
  descripcionUso: string;
  cantidadEstudiantes: string;
}

interface BloqueHorarioOption {
  id: number;
  label: string;
  horaInicio?: string | null;
  horaFinal?: string | null;
}

interface CursoOption {
  id: number;
  nombre: string;
  ciclo?: string;
}

// =====================================
// FUNCIONES UTILITARIAS
// =====================================

const formatDateToInputValue = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toISOString().split('T')[0];
};

const formatDateToIso = (date: Date): string =>
  date.toISOString().split('T')[0];

const getTodayIsoDate = (): string =>
  formatDateToIso(new Date());

const isToday = (value: string): boolean => {
  const today = getTodayIsoDate();
  return value === today;
};

const getCurrentWeekBoundaries = () => {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
};

const getCurrentWeekSaturdayIsoDate = (): string =>
  formatDateToIso(getCurrentWeekBoundaries().end);

const isDateWithinCurrentWeek = (value: string): boolean => {
  const [y, m, d] = value.split('-').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;

  const date = new Date(y, m - 1, d);
  const { start, end } = getCurrentWeekBoundaries();

  return date >= start && date <= end;
};

const createFormStateFromReserva = (reserva: ReservaApi | null): ReservaFormState => ({
  fechaReserva: formatDateToInputValue(reserva?.fechaReserva) || getTodayIsoDate(),
  bloqueId: reserva?.bloqueId ? reserva.bloqueId.toString() : '',
  cursoId: reserva?.cursoId ? reserva.cursoId.toString() : '',
  descripcionUso: reserva?.descripcionUso ?? '',
  cantidadEstudiantes: reserva?.cantidadEstudiantes ? reserva.cantidadEstudiantes.toString() : '',
});

// -----------------------------------

const parseBloques = (data: unknown): BloqueHorarioOption[] => {
  if (!Array.isArray(data)) return [];

  return (data as any[])
    .map((item) => {
      const id = typeof item.id === 'number' ? item.id : null;
      const horaInicio = typeof item.horaInicio === 'string' ? item.horaInicio : null;
      const horaFinal = typeof item.horaFinal === 'string' ? item.horaFinal : null;

      if (!id) return null;

      const label = horaInicio && horaFinal
        ? `${horaInicio} - ${horaFinal}`
        : `Bloque ${id}`;

      return { id, label, horaInicio, horaFinal } as BloqueHorarioOption;
    })
    .filter((x): x is BloqueHorarioOption => Boolean(x));
};

const parseCursos = (data: unknown): CursoOption[] => {
  if (!Array.isArray(data)) return [];
  return (data as any[])
    .map((item) => {
      const id = typeof item.id === 'number' ? item.id : null;
      const nombre = typeof item.nombre === 'string' ? item.nombre.trim() : null;
      const ciclo = typeof item.ciclo === 'string' ? item.ciclo.trim() : '';

      if (!id || !nombre) return null;

      return { id, nombre, ciclo } as CursoOption;
    })
    .filter((x): x is CursoOption => Boolean(x));
};

// =====================================
// COMPONENTE PRINCIPAL
// =====================================

export const EditarReservaModal: React.FC<EditarReservaModalProps> = ({
  reserva,
  open,
  onClose,
  onReservaActualizada,
}) => {
  const [formState, setFormState] = useState<ReservaFormState>(() =>
    createFormStateFromReserva(reserva)
  );

  const [bloques, setBloques] = useState<BloqueHorarioOption[]>([]);
  const [cursos, setCursos] = useState<CursoOption[]>([]);
  const [isLoadingOpciones, setIsLoadingOpciones] = useState(false);
  const [opcionesError, setOpcionesError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // =====================================
  // CARGAR BLOQUES + CURSOS
  // =====================================

  useEffect(() => {
    if (!open || !reserva) return;

    if (!reserva.espacioId) {
      setOpcionesError("No se pudo determinar el espacio de la reserva.");
      return;
    }

    const controller = new AbortController();
    setIsLoadingOpciones(true);

    Promise.all([
      fetch(getReservasApiUrl(`/api/espacios/${reserva.espacioId}/bloques`), {
        signal: controller.signal,
      }),
      fetch(getReservasApiUrl(`/api/espacios/${reserva.espacioId}/cursos`), {
        signal: controller.signal,
      }),
    ])
      .then(async ([bRes, cRes]) => {
        if (!bRes.ok) throw new Error("Error obteniendo bloques.");
        if (!cRes.ok) throw new Error("Error obteniendo cursos.");

        const bloquesData = await bRes.json();
        const cursosData = await cRes.json();

        setBloques(parseBloques(bloquesData));
        setCursos(parseCursos(cursosData));
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setOpcionesError(err instanceof Error ? err.message : "Error desconocido.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingOpciones(false);
        }
      });

    return () => controller.abort();
  }, [open, reserva]);

  // =====================================
  // RESET AL ABRIR
  // =====================================

  useEffect(() => {
    if (!open) {
      setSuccessMessage(null);
      setSubmitError(null);
      return;
    }
    setFormState(createFormStateFromReserva(reserva));
  }, [open, reserva]);

  // =====================================
  // HANDLERS
  // =====================================

  const handleChange: React.ChangeEventHandler<any> = (e) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reserva) return;

    if (!isDateWithinCurrentWeek(formState.fechaReserva)) {
      setSubmitError("Solo puedes modificar reservas dentro de la semana actual.");
      return;
    }

    const payload = {
      usuarioId: reserva.usuarioId,
      espacioId: reserva.espacioId,
      bloqueId: Number(formState.bloqueId),
      cursoId: Number(formState.cursoId),
      fechaReserva: formState.fechaReserva,
      descripcionUso: formState.descripcionUso || null,
      cantidadEstudiantes: Number(formState.cantidadEstudiantes),
      estado: reserva.estado ?? "Pendiente",
    };

    try {
      setIsSubmitting(true);
      const actualizada = await updateReserva(reserva.id, payload);
      setSuccessMessage("Reserva actualizada.");
      onReservaActualizada?.(actualizada);
    } catch (err) {
      setSubmitError("No se pudo actualizar la reserva.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // =====================================
  // SI EL MODAL ESTÁ CERRADO → NO RENDER
  // =====================================

  if (!open || !reserva) return null;

  // =====================================
  // RENDER DEL MODAL
  // =====================================

  return (
    <div className="reserva-modal">
      <div className="reserva-modal__overlay" onClick={onClose} />

      <div className="reserva-modal__content">
        <header className="reserva-modal__hero">
          <div>
            <h2>{reserva.espacioNombre ?? `Reserva #${reserva.id}`}</h2>
          </div>

          <button className="reserva-modal__close" onClick={onClose}>
            <X />
          </button>
        </header>

        <form className="reserva-form" onSubmit={handleSubmit}>
          {/* FECHA */}
          <label>
            <span>Fecha de uso</span>
            <input
              type="date"
              name="fechaReserva"
              value={formState.fechaReserva}
              min={getTodayIsoDate()}
              max={getCurrentWeekSaturdayIsoDate()}
              onChange={handleChange}
              required
            />
          </label>

          {/* BLOQUE */}
          <label>
            <span>Bloque horario</span>
            <select
              name="bloqueId"
              value={formState.bloqueId}
              onChange={handleChange}
              required
            >
              <option value="">Selecciona un bloque</option>
              {bloques.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>

          {/* CURSO */}
          <label>
            <span>Curso asociado</span>
            <select
              name="cursoId"
              value={formState.cursoId}
              onChange={handleChange}
              required
            >
              <option value="">Selecciona un curso</option>
              {cursos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.ciclo ? `· ${c.ciclo}` : ""}
                </option>
              ))}
            </select>
          </label>

          {/* CANTIDAD */}
          <label>
            <span>Cantidad estimada de estudiantes</span>
            <input
              type="number"
              name="cantidadEstudiantes"
              min={1}
              value={formState.cantidadEstudiantes}
              onChange={handleChange}
              required
            />
          </label>

          {/* DESCRIPCIÓN */}
          <label>
            <span>Descripción del uso</span>
            <textarea
              name="descripcionUso"
              rows={3}
              value={formState.descripcionUso}
              onChange={handleChange}
            />
          </label>

          {/* ERRORES */}
          {submitError && <div className="reserva-form__error">{submitError}</div>}
          {successMessage && <div className="reserva-form__feedback">{successMessage}</div>}

          {/* BOTONES */}
          <div className="reserva-form__actions">
            <button type="button" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="spinning" size={16} /> Guardando...
                </>
              ) : (
                <>
                  <Save size={16} /> Confirmar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
