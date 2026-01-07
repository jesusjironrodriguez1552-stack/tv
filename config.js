// config.js - CONEXIÓN GLOBAL A SUPABASE
const SUPABASE_URL = "https://mdetlqvfdgtfatufdkht.supabase.co";
const SUPABASE_KEY = "sb_publishable_TV9x9pfZw_vYR3-lF7NCIQ_ybSLs5Fh";

// Inicializamos el cliente una sola vez para todo el sistema
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("SISTEMA CVSE: Conexión con Supabase establecida.");
