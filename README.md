jquery.partition
=====

jquery.partition -- a visual jquery partition ui component

Copyright (C) 2014 zzzworm.

This program is free software; you can redistribute it and/or modify it under
the terms of the GNU General Public License (GPL) version 3 as published by the
Free Software Foundation.

A copy of the GNU GPLv3 should have been distributed with this sofware.  If a
copy was not provided it may be downloaded at the following URL:

http://www.gnu.org/licenses/gpl-3.0.txt

*******************************************************************************` 

Detailed information on sshpt as well as the latest version can be found at the
following URL:

	https://github.com/zzzworm/jquery-partitioner
usage:

   $("#sysDiskPartGraph").partitioner({ 
		max: 1024*1024*1024*200,
		values:[20*1024*1024*1024,50*1024*1024*1024,100*1024*1024*1024],
		colors:["blue","green","yellow","#ccc","gray"],
		disabled:true,
		indicator:function(range,index,spanVal){
			range.text(partType[index]+":"+FormateDiskSize(spanVal));
		}

You can custom the appearance of the control by use css. The example css is plugin.css.
