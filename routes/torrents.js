const Archiver = require('archiver');

const streamHead = (torrent) => {

	isAllow = 0;
	res.on('close', () => {
		isAllow = 1;
		console.log(`[Client Is Disconnected]`);
		try {
			try { client.remove(magnetURI) }
			catch(err) { console.log('[torrents]Error: Magnet Remove') }

			clearInterval(interval);
		}
		catch(err) {
			console.log('[torrents]Close Error:', err);
		}
	})
	
	let torrentFilesNumber = torrent.files.length;
	let id = -1;
	for(i = 0; i < torrentFilesNumber; i++) {
		if(torrent.files[i].name == req.params.file_name) {
			id = i;
			break;
		}
	}
	if(id === -1)
		return res.redirect('https://flai.ml/#/error');

	res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-disposition': 'attachment; filename=Immortal.zip'
    });
    const zip = Archiver('zip');
    zip.pipe(res);

    let j = 0;

    let heatStream = '';

    let alpha = -1;
    let beta = 0;

    let notStreamed = '';

    interval = setInterval(() => {
    	if(alpha === beta && j <= torrentFilesNumber) {
    		if(j < torrentFilesNumber) {
	    		notStreamed += `${torrent.files[j].name}\n`;
	    		zip.append(`${beta} bytes`, { name: `[Download Buffers].txt` });
    		}
    		j++;
    		autoStreamOnEnd();
    	}
    	else {
    		zip.append(`${beta} bytes`, { name: `[Download Buffers].txt` });
    		alpha = beta;
    	}
    }, 25000);

    const autoStreamOnEnd = () => {

    	if(j < torrentFilesNumber) {
    		heatStream = torrent.files[j].createReadStream(torrent.files[j].name);	
    		heatStream.on('data', (chunk) => {
    			beta += chunk.length;
    		}).on('end', (err) => {
    			if(j <= torrentFilesNumber) {
    				console.log(`(${j} of ${torrentFilesNumber}): ${torrent.files[j].name} ${beta/1000000} mb`);
    				heatStream = torrent.files[j].createReadStream(torrent.files[j].name);
    				heatStream.on('end', () => {
    					j++;
    					autoStreamOnEnd();
    				})
    				zip.append(heatStream, {name: torrent.files[j].name});
    			}
    		}).on("error", (err) => {
				return next(err);
			});
    	}
    	if(j > torrentFilesNumber) {

    		let count = 0;
    		for(q = 0; q < notStreamed.length; q++)
    			if(notStreamed[q] === '\n')
    				count += 1;

    		zip.append(notStreamed, {name: `[Not Downloaded].txt`});
    		clearInterval(interval);
    		zip.finalize();
    		isAllow = 1;
    		try { client.remove(magnetURI) }
			catch(err) { console.log('[torrents]Error: Magnet Remove') }
    	}
    }

    autoStreamOnEnd();
}


const handleTorrents = (req, res, next, client) => {

	if(isAllow === 1) {
		try {

			if(client.get(magnetURI)) {

				const torrent = client.get(magnetURI);
				streamHead(req, res, next, torrent, magnetURI);
			}
			else {
				client.add(magnetURI, (torrent) => {

					streamHead(req, res, next, torrent, magnetURI);

				}).on('error', (err) => {

					console.log('[torrents]Error: Cannot Add Torrent');

					try { client.remove(magnetURI) }
					catch(err) { console.log('Err:', err) }

					res.redirect('https://flai.ml/#/error');
				});
			}
		}
		catch(err) {
			isAllow = 1;
			console.log("[torrents]Error: Zip");

			try { client.remove(magnetURI) }
			catch(err) { console.log('Error: Magnet Remove') }

			res.redirect('https://flai.ml/#/error');
			//process.setMaxListeners(0);
		}
	}
	else {
		let error = new Error('[torrents][Busy Server]');
    	throw error;
	}
}
module.exports = {
	handleTorrents: handleTorrents
}	