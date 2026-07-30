#!/bin/bash
# =====================================================================
# correr-todas-las-pruebas.sh
# ---------------------------------------------------------------------
# Corre TODAS las suites automatizadas de la plataforma NOM-035 en una
# sola pasada. Util como "smoke test" antes de cada despliegue.
#
# Requiere: node, y las dependencias npm ya instaladas
# (jsdom, xlsx, docx, pptxgenjs) en el mismo directorio.
# =====================================================================
set -uo pipefail

SUITES=(
  "scoring-engine.test.js:Modulo 3 (motor de calificacion)"
  "colaborador.e2e.test.mjs:Modulo 4 (colaborador)"
  "admin-seguimiento.test.mjs:Modulo 5 (seguimiento)"
  "admin-analisis.test.mjs:Modulo 6 (analisis)"
  "admin-reportes.test.mjs:Modulo 7 (reportes - contenido y Excel)"
  "admin-reportes.test-libs.mjs:Modulo 7 (reportes - Word/PowerPoint reales)"
  "admin-historico.test.mjs:Modulo 8 (historico)"
)

TOTAL_OK=0
TOTAL_FALLIDAS=0
RESUMEN=()

echo "======================================================================"
echo " REGRESION COMPLETA - PLATAFORMA NOM-035"
echo "======================================================================"

for entrada in "${SUITES[@]}"; do
  archivo="${entrada%%:*}"
  nombre="${entrada#*:}"
  echo ""
  echo "----------------------------------------------------------------------"
  echo " ${nombre}  (${archivo})"
  echo "----------------------------------------------------------------------"
  if [ ! -f "$archivo" ]; then
    echo "   OMITIDO: archivo no encontrado en este directorio."
    RESUMEN+=("OMITIDO  - ${nombre}")
    continue
  fi
  if timeout 60 node "$archivo"; then
    RESUMEN+=("OK       - ${nombre}")
    TOTAL_OK=$((TOTAL_OK+1))
  else
    RESUMEN+=("FALLO    - ${nombre}")
    TOTAL_FALLIDAS=$((TOTAL_FALLIDAS+1))
  fi
done

echo ""
echo "======================================================================"
echo " RESUMEN"
echo "======================================================================"
for linea in "${RESUMEN[@]}"; do
  echo " $linea"
done
echo ""
echo " Suites OK: ${TOTAL_OK}   Suites con fallas: ${TOTAL_FALLIDAS}"
echo "======================================================================"

if [ "$TOTAL_FALLIDAS" -gt 0 ]; then
  exit 1
fi
exit 0
