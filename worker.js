// @ts-ignore
// @ts-nocheck
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// --- Header CORS Universal ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env, ctx) {
    // Menangani permintaan preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Menangani permintaan GET (saat diakses dari browser)
    if (request.method === 'GET') {
      return new Response('Metode tidak diizinkan. Harap gunakan POST.', {
        status: 405,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain',
        },
      });
    }

    // Hanya proses permintaan POST
    if (request.method === 'POST') {
      try {
        const { fileName, fileType } = await request.json();
        if (!fileName || !fileType) {
          return new Response(JSON.stringify({ error: 'fileName dan fileType diperlukan.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const s3 = new S3Client({
          region: "auto",
          endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          },
        } );

        const command = new PutObjectCommand({
          Bucket: env.R2_BUCKET_NAME,
          Key: fileName,
          ContentType: fileType,
        });

        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        const permanentUrl = `${env.R2_PUBLIC_URL}/${fileName}`;

        return new Response(JSON.stringify({ uploadUrl, permanentUrl }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error) {
        console.error('Error di worker:', error);
        return new Response(JSON.stringify({ error: 'Terjadi kesalahan internal di server.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Fallback untuk metode lain yang tidak didukung
    return new Response('Metode tidak didukung.', {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });
  },
};
