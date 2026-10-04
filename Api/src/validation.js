import { HttpError } from "./errors.js";

function rawQuery(query, key) {
  const value = query[key];
  if (Array.isArray(value) || (value && typeof value === "object")) {
    throw new HttpError(400, `El parámetro ${key} debe aparecer una sola vez.`);
  }
  return value;
}

export function queryText(query, key, maxLength) {
  const raw = rawQuery(query, key);
  if (raw === undefined || raw === "") return null;
  const value = raw.trim();
  if (value.length > maxLength) throw new HttpError(400, `${key} supera ${maxLength} caracteres.`);
  return value || null;
}

export function queryInteger(query, key, { min = 1, max = 2147483647, required = false } = {}) {
  const raw = rawQuery(query, key);
  if (raw === undefined || raw === "") {
    if (required) throw new HttpError(400, `${key} es obligatorio.`);
    return null;
  }
  if (!/^-?\d+$/.test(raw)) throw new HttpError(400, `${key} debe ser un número entero.`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new HttpError(400, `${key} debe estar entre ${min} y ${max}.`);
  }
  return value;
}

export function queryDecimal(query, key) {
  const raw = rawQuery(query, key);
  if (raw === undefined || raw === "") return null;
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new HttpError(400, `${key} debe ser un monto con hasta dos decimales.`);
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    throw new HttpError(400, `${key} está fuera del rango permitido.`);
  }
  return value;
}

export function queryDate(query, key) {
  const raw = rawQuery(query, key);
  if (raw === undefined || raw === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new HttpError(400, `${key} debe usar el formato YYYY-MM-DD.`);
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== raw) {
    throw new HttpError(400, `${key} no es una fecha válida.`);
  }
  return date;
}

export function queryPage(query) {
  const pageNumber = rawQuery(query, "pageNumber") ?? "1";
  const pageSize = rawQuery(query, "pageSize") ?? "25";
  const page = Number(pageNumber);
  const size = Number(pageSize);
  if (!Number.isInteger(page) || page < 1) throw new HttpError(400, "pageNumber debe ser un entero positivo.");
  if (!Number.isInteger(size) || size < 1 || size > 100) throw new HttpError(400, "pageSize debe estar entre 1 y 100.");
  return { pageNumber: page, pageSize: size };
}

export function bodyObject(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "El cuerpo debe ser un objeto JSON.");
  }
  return body;
}

export function bodyInputs(body, definitions) {
  bodyObject(body);
  const allowed = new Set(definitions.map(({ key }) => key));
  const unknown = Object.keys(body).filter((key) => !allowed.has(key));
  if (unknown.length) throw new HttpError(400, `Campo(s) no reconocido(s): ${unknown.join(", ")}.`);

  const inputs = [];
  for (const definition of definitions) {
    const { key, parameter, type, required = false, maxLength, min, max, nullable = false, parse } = definition;
    if (!Object.hasOwn(body, key)) {
      if (required) throw new HttpError(400, `${key} es obligatorio.`);
      continue;
    }

    const raw = body[key];
    if (raw === null) {
      if (!nullable) throw new HttpError(400, `${key} no puede ser null.`);
      inputs.push({ name: parameter, type, value: null });
      continue;
    }

    let value = raw;
    if (parse) value = parse(raw, key);
    else if (typeof raw === "string") {
      value = raw.trim();
      if (!value && required) throw new HttpError(400, `${key} es obligatorio.`);
      if (maxLength && value.length > maxLength) throw new HttpError(400, `${key} supera ${maxLength} caracteres.`);
      if (!value && nullable) value = null;
    } else if (typeof raw === "number") {
      if (!Number.isFinite(raw) || (min !== undefined && raw < min) || (max !== undefined && raw > max)) {
        throw new HttpError(400, `${key} está fuera del rango permitido.`);
      }
    }
    if (value === null && nullable) inputs.push({ name: parameter, type, value });
    else if (value !== "") inputs.push({ name: parameter, type, value });
  }
  return inputs;
}

export function bodyCoordinatePair(body, { required = false } = {}) {
  const hasLatitude = Object.hasOwn(body, "deliveryLatitude");
  const hasLongitude = Object.hasOwn(body, "deliveryLongitude");
  if (hasLatitude !== hasLongitude) {
    throw new HttpError(400, "Envía latitud y longitud juntas.");
  }
  if (!hasLatitude) {
    if (required) throw new HttpError(400, "Envía las coordenadas de entrega o null en ambas.");
    return undefined;
  }

  const latitude = body.deliveryLatitude;
  const longitude = body.deliveryLongitude;
  if ((latitude === null) !== (longitude === null)) {
    throw new HttpError(400, "La latitud y longitud deben ser ambas null o ambas tener valor.");
  }
  if (latitude !== null) {
    for (const [key, value] of [["deliveryLatitude", latitude], ["deliveryLongitude", longitude]]) {
      if (typeof value !== "number" || !Number.isFinite(value)) throw new HttpError(400, `${key} debe ser numérico.`);
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new HttpError(400, "Las coordenadas están fuera de rango.");
    }
  }
  return [
    { name: "DeliveryLatitude", type: undefined, value: latitude },
    { name: "DeliveryLongitude", type: undefined, value: longitude },
  ];
}

export function bodyBoolean(value, key) {
  if (typeof value !== "boolean") throw new HttpError(400, `${key} debe ser true o false.`);
  return value;
}

export function bodyInteger(value, key, { min = 1, max = 2147483647 } = {}) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new HttpError(400, `${key} debe ser un entero entre ${min} y ${max}.`);
  }
  return value;
}

export function bodyDate(value, key) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, `${key} debe usar el formato YYYY-MM-DD.`);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, `${key} no es una fecha válida.`);
  }
  return date;
}

export function bodyDecimal(value, key, { min, max, scale = 2 } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new HttpError(400, `${key} debe ser numérico.`);
  const precision = new RegExp(`^-?\\d+(?:\\.\\d{1,${scale}})?$`);
  if (!precision.test(String(value))) throw new HttpError(400, `${key} acepta hasta ${scale} decimales.`);
  if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
    throw new HttpError(400, `${key} está fuera del rango permitido.`);
  }
  return value;
}

export function bodyString(value, key, { maxLength, required = false } = {}) {
  if (typeof value !== "string") throw new HttpError(400, `${key} debe ser texto.`);
  const result = value.trim();
  if (required && !result) throw new HttpError(400, `${key} es obligatorio.`);
  if (maxLength && result.length > maxLength) throw new HttpError(400, `${key} supera ${maxLength} caracteres.`);
  return result;
}
