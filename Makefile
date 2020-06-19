all : reminder_alarm_clock@trifonovkv.gmail.com.zip 

reminder_alarm_clock@trifonovkv.gmail.com.zip : compile-schemas
	zip -r $@ . -x@exclude.lst

compile-schemas :
	glib-compile-schemas schemas/

example.pot :
	xgettext --from-code=UTF-8 --output=po/example.pot *.js