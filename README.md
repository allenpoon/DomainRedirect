# DomainRedirect

### Example of Config
```json
{
	"httpBind" : [["::1", 80], ["0.0.0.0", 80]],
	"httpsBind": [["::1",443], ["0.0.0.0",443]],
	"certPath" : "/cert/",
	"defaultDomain" : "www.example.com",
	"maxTryStart" : 60,
	"retryWait" : 60,
	"sslSecureMethod" : "SSLv23_server_method",
	"sslSecureOptions" : ["SSL_OP_NO_SSLv2", "SSL_OP_NO_SSLv3", "SSL_OP_NO_TLSv1", "SSL_OP_NO_TLSv1_1"],
	"sslCiphers" : [
		"ECDHE",
		"DHE",
		"RSA",
		"AES",
		"3DES",
		"!RC4",
		"!MD5",
		"!DES",
		"!MD5",
		"!aNULL",
		"!eNULL",
		"!EXPORT",
		"!PSK",
		"!SRP",
		"!CAMELLIA"
	],
	"site" : {
		"example.com" : {
			"host" : "192.168.1.2",
			"port" : 1443,
			"https": true,
			"keyPath" : "/192.168.1.2/.key",
			"crtPath" : "/192.168.1.2/.crt",
			"caPath" : "/192.168.1.2/.ca"
		},
		"www.example.com" : {
			"host"  : "internal.example.com",
			"port"  : 80,
			"https" : false
		}
	}
}
```

* httpBind / httpsBind <require>
  * Raw Socket / Secure Socket bind to address:port
  * It can be multiple
* certPath <require>
  * Default localtion to placing certifications
  * If the keyPath, crtPath, and caPath is not set in site.<domain>, it will load from this path
  * Cert location for above example
    * /cert/example.com/.key
    * /cert/example.com/.crt
    * /cert/example.com/.ca
    * /192.168.1.2/.key
    * /192.168.1.2/.crt
    * /192.168.1.2/.ca
* defaultDomain <require>
  * Use in default certification
  * Use if client does not support SNI
* maxTryStart <optional>
  * Default: 100
  * Maximum number of try to start the server
* retryWait <optional>
  * Default: 60
  * Duration between server fork exit  unexpectedly and server re-fork
* sslSecureMethod <optional>
  * The protocol for secure socket
  * Supporting following protocol
    * SSLv23_method
    * SSLv23_server_method
    * TLSv1_method
    * TLSv1_server_method
    * TLSv1_1_method
    * TLSv1_1_server_method
    * TLSv1_2_method
    * TLSv1_2_server_method
* sslSecureOptions <optional>
  * Set which protocol to use or not to use in secure socket
  * Support following options
    * SSL_OP_NO_SSLv2 (disable by default)
    * SSL_OP_NO_SSLv3 (disable by default)
    * SSL_OP_NO_TLSv1
    * SSL_OP_NO_TLSv1_1
    * SSL_OP_NO_TLSv1_2
    * or other options which is in require('constants').SSL_OP_*
* sslCiphers <optional>
  * Set which ciphers to use or not to use in secure socket
* site <require>
  * domain <require>
    * host <require>
      * destination host for specific domain
    * port <require>
      * destination port for specific domain
    * https <require>
      * Is destination service using secure socket
    * keyPath <optional>
      * location for the domain certification key
    * crtPath <optional>
      * location for the domain certification
    * caPath <optional>
      * location for the domain certification chain (currently support 1 ca)
