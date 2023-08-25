package config

import (
	"time"

	"github.com/spf13/viper"
)

type Bundlr struct {
	// List of urls that can be used, order matters
	Urls []string

	// Time limit for requests. The timeout includes connection time, any
	// redirects, and reading the response body
	RequestTimeout time.Duration

	// Miminum time a peer needs to answer in order to be considered responsive.
	// This should be much smaller than request timeout
	CheckPeerTimeout time.Duration

	// Maximum amount of time a dial will wait for a connect to complete.
	DialerTimeout time.Duration

	// Interval between keep-alive probes for an active network connection.
	DialerKeepAlive time.Duration

	// Maximum amount of time an idle (keep-alive) connection will remain idle before closing itself.
	IdleConnTimeout time.Duration

	// Maximum amount of time waiting to wait for a TLS handshake
	TLSHandshakeTimeout time.Duration

	// https://ar-io.zendesk.com/hc/en-us/articles/7595655106971-arweave-net-Rate-Limits
	// Time in which max num of requests is enforced
	LimiterInterval time.Duration

	// Max num requests to particular peer per interval
	LimiterBurstSize int

	// Wallet used to signing transactions
	Wallet string
}

func setBundlrDefaults() {
	viper.SetDefault("Bundlr.Urls", []string{"https://node1.bundlr.network"})
	viper.SetDefault("Bundlr.RequestTimeout", "60s")
	viper.SetDefault("Bundlr.CheckPeerTimeout", "1s")
	viper.SetDefault("Bundlr.DialerTimeout", "30s")
	viper.SetDefault("Bundlr.DialerKeepAlive", "15s")
	viper.SetDefault("Bundlr.IdleConnTimeout", "31s")
	viper.SetDefault("Bundlr.TLSHandshakeTimeout", "10s")
	viper.SetDefault("Bundlr.LimiterInterval", "1ms")
	viper.SetDefault("Bundlr.LimiterBurstSize", "1000000")
	// This is an empty wallet
	viper.SetDefault("Bundlr.Wallet", `{
		"d": "IVv3IzUPbj2yJP9qqJcH3cVI86jWdhZCpNoomLeJaH0rpKnujzlDSADC2yuFNBnS_sIthk1-w83_bkTwwOOCAn_9LZbkKYEd2onZ7iWAh--tMB5ijNHv0acn64TZjS-5aH6WgfsxwCjrXj57ejnh7GaterucVpTX_RlGtpp5IWY5ISM-5JLBm2wLLnXjhsJD51a03eClxy0MAclG6suOkm2pRF7yl1sJjQ23kZ7xExpO-Lb_j8o1JEGao5xI1TPWdJyovuhPrWK14l3JXU9URz6IKFH9xuvbWjqWhyVQVjUBBWg5B5DbzQhI_6tPVHb8eUBP9L9BNkRyr5cWU1SCYynzEa9_1cXjLuYNtTUB9358bkveYiZRlvSjCYoNd6lSFtESbyMfvmU2FF7gnduVqzdTPuisfHHNYQKCall-emCt9Oiy26OJ2uMX-dfqutcZd65OlJN5KG65h6D8cp7xjDlwHx4VeK2qI-dyzOS6ufZlG0nrNEfzRDekmRsFCgZxJUjc0JjCMde5LRKZhsmltntizeaURw69dnNTrtrLFQLlo6X3wEHzyjFNqaqJDQmB6UnpdOjZp6FeotV02FpeqhJZ8pA1kYywO9LFB-iciy7h-bufHoK5Owti-CwOMADdwzYPPaKrbhc7ZhAuogQTMfFSHJtL5_le_Y-k8FTtu4E",
		"dp": "phZwSYPUvAO-231R-_IuLMHB294qzoiHeg1GUBEAvf4PqA95dgQAXUQUTEVUBuOvJ89g4Zubz3QcRabzEeySGDHLhF0x5BdUCmZugiQJ_MphBPTa82PPDWWohPTdztt8L-2mXWAJRHQqesT4zix7cKYao9wbWvG-9i0sDzk9hfFT9HNM8yr5-Sp089so-5jro-48ZWa97nhsOKDvNamHX9BdOX-TSl97txlSf5IjgXeGUImgIcIgZAdnp7cWjo2rYodyaeJ_yh_dGEnVL1XauVJ5gochLIKcIIZWaO0ENqvPJdly_TT7FUHG-uLUicSGRJuloBooZzLUzMuasSZwoQ",
		"dq": "X_oppBgiMcI6fyuvlTI9YaveiJmLWI_B2T1IsdU0xPS1PvPdjLq5ArK7NpqlkWsaF3Y4eR96uPniNPGrnvl7Z4A383G7zOXtlFzuYZxvXMGs9G46VNVXxT0vvO9Htm4Zp8W11eW9MneKXdeJ-uMUcTw3vlCgXG8x9C2CcTqRN_J3PNiWmkHT2FE5Tbqwj36MPPOOInI-22k3UG2OX2qOrQoFD6SPgRoRLJmRLDl_ktJ1rQus187FfNgmB77-qeg_p772jwLxnzIvay4WmehJdI1wdp_JlKmQkEqknAq_ab0ltLcofqCR4-_2MkFMLksqVDilUtQkH3Od0QYIlbM9kw",
		"e": "AQAB",
		"ext": true,
		"kty": "RSA",
		"n": "xEDoW3dIO93QcmK3G1bgNrguKoI1eSsgtBd5IERwJOtpqM2cBDlqkMbMhcy3dzL-0YPSPAB78HudvhnmNlTRWas9zqPX7nj0CtcDlbntAWIyjUXUUbqdRHUkvOpUzEcdU-x9ZLFPOJfAMAZ5Wh0kdASjptyWzQLRErBkX_4nzIJm79SdLkYvkr5toJxPtdxlVXRgcEU1ZuythSGRPKH_CNRsJVMqJxqWBGU4JgVks1LeVZ-sUvQSWVGCMCRRqPdaAEFjFLTeNknLuMDvngc00mE9GeESISENSNiVUc5Zy7pOX0I9NuuUOFl8XjnjIbJBoxX_MnJNhj4pFu3X-l20_ejlKlYrkSFeWHcw0u2_wsCrGuwsNQrrL1iUHSe7ohhB7HLmJ-DQd1BaatUMsRTxLpGR1n_fgq_3xbtm0xsZ83dLJkr8ewNtp63v18LBzJIJmaYW1rICBnmEK8IChDIWjZOk5tQ7ghMNO10bgrnI0Ba0l_arZM3lPISv74kRG_BuS3MiDUqZ5bYD_S5QYknWf6LzBWlSd0aOVScA1ZFBtnuLu4DETCDNivAXqGYbsvDHJsytXgeVWiRog44E1hHR2Xd2W2ax5KsZaxRGwl4KxUF-WnMu8kVgPZFUkIUPQpy7nQNFkyb-F6wemYRZeaPkKy96HD3Zfy_yvEVH4r_LJZs",
		"p": "-2r7Ncw3A6IqNvgGrWtPmGcdljQlNYhtGXFCyj8Juhm-Tn8jyGb45mYpy6rOcCIwiAn8PsCVvJ1DGZlUdJp5DoKPA6KEGviDzO0ANFV0z71h4X_sLk3CZJ7uQ7NuLqxrToZDf2q_ENA6Xg_MFAqC2dKVYCCKdGAiS5flZMEf_B0-0aw1WbNfnXGUKNMNyzIgXH3I10EBFVYfNBnTySGUmmZ3twmeimfYfgyFf56SKyLNj91IUCWqxSPj8XhYHUJYGxMs-4wE8m7ysk7RZnGpQyro-wBXWHhMjqM3wXvWiSjSm_1zVQqcGCdt_6fqaLb5Uy82FFDkxcB4VyMh4uQKsQ",
		"q": "x9SNAr0sk186_9z8WwGGis5_HxOXfiiiqqNO_OaKbHTW1iYdbgQpdPlF-nft8gh4dAKzGQ6hPz0H64lcjL22LWUYjPDkGeByubHuFFbFGlnZpWBXNbceHvYxBrfLBRC2vug1QE21-c8Hww0VnNX0macM0E2sxruEDJXcvdz3jdf-42lPCNPlX73HVmmJACWzubKEsl_VK1MdwWZb_cNL7w6AdwOcug-_YZfMlPv9I8sTMqNwNKppWcrqV1bz0Or04ds1ifA-WR52eaodU8jSMa7j92GShKxtjJ6yaMutLaNtMxsuk1QTAKyAGGUH3HhW_BiS8P2LIGhW5binojWwCw",
		"qi": "XqpyET1rXxpqflIE_5fpVYzpJy316JgBcoFoaQwJXBV2S-AkiOgSHVP_OClZXj2ondHHpShvNbSmFZ8NDunbZhNqDWpXYWFJsdq8-Hcid-c0kipCfh75i799EdLs2HS8zAbbJiVhl5I0QeTE0n3mEUsNWDSMC0pIbZtKuc1Ij849rIxIDhMOKjEMCNUQJVn-FcajTttoamnUHzb4whFmgnMm8JWVDwdFK0Yt4TbchrHg4gpmGHzn1LD4mUPeqstd_JKgZQYMzZawAupN9C3SXDCYjAI6Glskjm-M5eC3yTEFnOE74cHymtI61rU-4-n2aPzMMPsJsLm7U8hzKkHEZg"
	}`)
}
