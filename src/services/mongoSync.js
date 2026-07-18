const canCompress = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

const compressData = async (stringData) => {
    const stream = new Blob([stringData]).stream().pipeThrough(new CompressionStream('gzip'));
    const response = new Response(stream);
    const buffer = await response.arrayBuffer();
    
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
};

const decompressData = async (base64Data) => {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const response = new Response(stream);
    return await response.text();
};

export const mongoSync = {
    testConnection: async (apiUrl, connectionString, db, collection) => {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                connectionString,
                db,
                collection,
                action: 'count',
                query: {}
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MongoDB connection test failed: ${response.status} - ${errorText}`);
        }

        const json = await response.json();
        if (!json.success) {
            throw new Error(json.error || 'Connection failed: API returned success: false');
        }

        return json;
    },

    pushState: async (apiUrl, connectionString, db, collection, documentId, stateData) => {
        let payload;
        let rawSize = 0;
        let compressedSize = 0;
        let wasCompressed = false;

        const jsonStr = JSON.stringify(stateData);
        rawSize = new Blob([jsonStr]).size;

        if (canCompress) {
            try {
                const compressedBase64 = await compressData(jsonStr);
                payload = {
                    compressed: true,
                    data: compressedBase64
                };
                wasCompressed = true;
                compressedSize = new Blob([JSON.stringify(payload)]).size;
            } catch (err) {
                console.warn("Compression failed, falling back to raw JSON push:", err);
                payload = {
                    compressed: false,
                    data: stateData
                };
                compressedSize = rawSize;
            }
        } else {
            payload = {
                compressed: false,
                data: stateData
            };
            compressedSize = rawSize;
        }

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                connectionString,
                db,
                collection,
                action: 'updateOne',
                query: { _id: documentId },
                update: payload,
                options: { upsert: true }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MongoDB push failed: ${response.status} - ${errorText}`);
        }

        const json = await response.json();
        if (!json.success) {
            throw new Error(json.error || 'Push failed: API returned success: false');
        }

        return {
            success: true,
            rawSize,
            compressedSize,
            wasCompressed
        };
    },

    pullState: async (apiUrl, connectionString, db, collection, documentId) => {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                connectionString,
                db,
                collection,
                action: 'find',
                query: { _id: documentId }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MongoDB retrieve failed: ${response.status} - ${errorText}`);
        }

        const json = await response.json();
        if (!json.success) {
            throw new Error(json.error || 'Retrieval failed: API returned success: false');
        }

        if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
            throw new Error(`No sync document found with ID "${documentId}" in your collection.`);
        }

        const doc = json.data[0];

        if (doc.compressed && typeof doc.data === 'string') {
            if (!canCompress) {
                throw new Error("This browser does not support DecompressionStream to read compressed cloud sync data.");
            }
            try {
                const decompressedText = await decompressData(doc.data);
                return JSON.parse(decompressedText);
            } catch (err) {
                throw new Error(`Decompression failed: ${err.message}`);
            }
        }

        return doc.data || doc;
    }
};
