#!/bin/bash

log_message() {
  echo "{\"node\":\"entrypoint\",\"level\":\"INFO\",\"message\":\"$1\",\"timestamp\":\"$(date +%s%3N)\"}"
}

validate_heap() {
  if [[ "$1" =~ ^[0-9]+[kKmMgG]$ ]]; then
    log_message "Heap $2=$1 validated"
  else
    log_message "Fehler: Ungültiger Wert für $2: $1"
    exit 1
  fi
}

log_message "Starting ForumSuite-Container..."

JAVA_XMX=${JAVA_XMX:-4G}
JAVA_XMS=${JAVA_XMS:-512M}
validate_heap $JAVA_XMX JAVA_XMX
validate_heap $JAVA_XMS JAVA_XMS

jarfilename=
for entry in *.jar; do
  jarfilename=$entry
done

log_message "Starting Forumsuite with version $jarfilename"
exec java -Xmx$JAVA_XMX -Xms$JAVA_XMS $JAVA_GC_OPTS $JAVA_EXTRA_OPTS \
  -Duser.timezone=Europe/Berlin \
  -jar $jarfilename
