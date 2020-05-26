all : reminder_alarm_clock@trifonovkv.gmail.com.zip 

reminder_alarm_clock@trifonovkv.gmail.com.zip : 
	zip -r $@ . -x@exclude.lst

