# The proxy settings of both public servers in nginx-site.conf, included there.
# Not named *.conf: ddev copies this folder into sites-enabled/, and nginx
# loads only *.conf from there.
#
# All proxy headers are set here and nowhere else: a location that sets any
# proxy_set_header inherits none of these.
proxy_http_version 1.1;
proxy_redirect off;
proxy_connect_timeout 3s;
proxy_read_timeout 190s;
proxy_buffers 32 256k;
proxy_buffer_size 128k;
proxy_busy_buffers_size 256k;
proxy_set_header Host $blokkli_host;
proxy_set_header X-Forwarded-Host $blokkli_host;
proxy_set_header X-Forwarded-Proto $blokkli_proto;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $blokkli_connection;
proxy_set_header Proxy "";
