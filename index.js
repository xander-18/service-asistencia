const axios = require("axios");
const moment = require('moment-timezone');
require("dotenv").config();

const API_URL_TUDOS = process.env.API_URL_TUDOS;
const API_URL_MARCAR = process.env.API_URL_MARCAR;


const getEmpleadosConDescansoFijo = async () => {
  try {
    const response = await axios.get(
      API_URL_TUDOS
    );
    const empleados = response.data.response;

    if (!Array.isArray(empleados)) {
      console.error("API response 'response' key is not an array:", empleados);
      throw new TypeError(
        "Expected an array of employees, but the API returned something else."
      );
    }
    
    const empleadosConDescansoFijo = empleados
      .filter(empleado => 
        empleado.descanso_fijo && 
        empleado.descanso_fijo.trim() !== ''
      )
      .map((empleado) => ({
        dni: empleado.dni,
        nombre: empleado.nombre,
        descanso_fijo: empleado.descanso_fijo,
        phone: empleado.phone,
      }));
    
    console.log(`Empleados con descanso fijo encontrados (${empleadosConDescansoFijo.length}):`, empleadosConDescansoFijo);
    return empleadosConDescansoFijo;
  } catch (error) {
    console.error("Error fetching empleados con descanso fijo:", error);
    throw error;
  }
};

const marcarAsistencia = async (dni) => {
  try {
    const response = await axios.post(
      API_URL_MARCAR,
      { 
        dni: dni,
        dia_descanso: true  
      }
    );
    console.log(`✅ DESCANSO marcado exitosamente para DNI: ${dni}`, response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error marcando DESCANSO:", error);
    throw error;
  }
};
const getDiaActual = () => {
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const hoy = new Date();
  return dias[hoy.getDay()].toLowerCase();
};

const normalizarDia = (dia) => {
  return dia.toLowerCase()
    .replace('é', 'e')
    .replace('á', 'a')
    .replace('í', 'i')
    .replace('ó', 'o')
    .replace('ú', 'u')
    .trim();
};

// Función para filtrar empleados que tienen descanso HOY
const getEmpleadosEnDescansoHoy = async () => {
  try {
    const empleadosConDescansoFijo = await getEmpleadosConDescansoFijo();
    const diaActual = getDiaActual();
    
    console.log(`\n📅 Día actual: ${diaActual}`);
    
    const empleadosEnDescansoHoy = empleadosConDescansoFijo.filter(empleado => {
      const diaDescansoNormalizado = normalizarDia(empleado.descanso_fijo);
      const esDescansoHoy = diaDescansoNormalizado === diaActual;
      
      console.log(`${empleado.nombre}: Descanso "${empleado.descanso_fijo}" (normalizado: "${diaDescansoNormalizado}") - ${esDescansoHoy ? '✅ Es su día de descanso' : '❌ No es su día de descanso'}`);
      
      return esDescansoHoy;
    });
    
    return empleadosEnDescansoHoy;
  } catch (error) {
    console.error("Error obteniendo empleados en descanso hoy:", error);
    throw error;
  }
};

const runAttendanceProcess = async () => {
  try {
    const empleadosEnDescansoHoy = await getEmpleadosEnDescansoHoy();
    
    if (empleadosEnDescansoHoy.length > 0) {
      console.log(`\n--- Iniciando marcación de DESCANSO para ${empleadosEnDescansoHoy.length} empleado(s) ---`);
      
      for (const empleado of empleadosEnDescansoHoy) {
        console.log(`\n🎯 Marcando DESCANSO para: ${empleado.nombre} (DNI: ${empleado.dni}) - Día de descanso: ${empleado.descanso_fijo}`);
        
        try {
          const resultado = await marcarAsistencia(empleado.dni);
          console.log(`✅ DESCANSO marcado exitosamente para ${empleado.nombre}`);
          console.log(`📝 Tipo de marcación: ${resultado.marcacion?.tipo_marcacion || 'DESCANSO'}`);
        } catch (error) {
          console.error(`❌ Error marcando DESCANSO para ${empleado.nombre}:`, error.message);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log("\n--- Proceso de marcación de DESCANSO completado ---");
    } else {
      console.log("\n💤 No hay empleados en su día de descanso hoy. No se marcará nada.");
    }
  } catch (error) {
    console.error("❌ Error en el proceso de marcación de descanso:", error);
  }
};

function msHastaProximaOchoAM() {
  // Calcula los milisegundos hasta la próxima 8:00 AM en Lima
  const ahoraLima = moment.tz('America/Lima');
  let proxima = ahoraLima.clone().hour(8).minute(0).second(0).millisecond(0);
  if (proxima.isSameOrBefore(ahoraLima)) {
    proxima = proxima.add(1, 'day');
  }
  const ms = proxima.valueOf() - ahoraLima.valueOf();
  console.log(`[LOG] Próxima ejecución diaria programada para: ${proxima.format('YYYY-MM-DD HH:mm:ss')} (America/Lima)`);
  return ms;
}

function ejecutarDiario() {
  console.log(`[LOG] Iniciando ciclo de ejecución diaria: ${moment.tz('America/Lima').format('YYYY-MM-DD HH:mm:ss')}`);
  runAttendanceProcess().finally(() => {
    setTimeout(ejecutarDiario, 24 * 60 * 60 * 1000);
  });
}


setTimeout(ejecutarDiario, msHastaProximaOchoAM());

//// runAttendanceProcess();
