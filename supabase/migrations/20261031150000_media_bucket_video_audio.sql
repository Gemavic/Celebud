-- The article editor's video and audio buttons upload to the "media" bucket,
-- but the bucket only accepted 4 image types up to 5 MB, so every video and
-- audio upload (and most phone photos) was rejected. Allow the common
-- video/audio formats and files up to 50 MB (the project's per-file cap).
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/gif','image/avif',
      'video/mp4','video/webm','video/quicktime','video/x-m4v',
      'audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/m4a','audio/aac',
      'audio/wav','audio/x-wav','audio/ogg','audio/webm'
    ]
where id = 'media';
