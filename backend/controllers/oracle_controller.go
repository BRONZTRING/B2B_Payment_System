package controllers

import (
	"fmt"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// 全局实时汇率与新闻状态 (受读写锁保护，防止高并发竞态崩溃)
var (
	mutex       sync.RWMutex
	FiatRates   = map[string]float64{"USD": 1.00, "CNY": 7.23, "RUB": 92.50, "EUR": 0.92, "GBP": 0.79, "JPY": 150.12}
	CurrentNews = "🟢 [GLOBAL CLEAR] 全球宏观经济稳定，国际供应链网络运转正常。"
	NewsTime    = time.Now()
)

// 宏观事件结构体
type MacroEvent struct {
	News       string
	Currency   string
	Multiplier float64 // 汇率乘数：>1 代表贬值，<1 代表升值
}

// 国际关系与地缘政治事件库
var eventPool = []MacroEvent{
	{"🚨 [SANCTIONS] 突发：新一轮国际金融制裁落地，结算通道受阻，卢布 (RUB) 暴跌 12%！", "RUB", 1.12},
	{"📉 [MACRO] 欧洲央行意外宣布降息 50 个基点，资本外流导致欧元 (EUR) 走弱！", "EUR", 1.06},
	{"🚢 [LOGISTICS] 苏伊士运河突发拥堵，亚洲供应链延误恐慌推高日元 (JPY) 避险情绪！", "JPY", 0.95},
	{"💰 [TRADE] 中国本季度出口数据远超华尔街预期，强劲贸易顺差使人民币 (CNY) 强势升值！", "CNY", 0.97},
	{"🔥 [CRISIS] 英国伦敦金融城遭遇大规模网络攻击，英镑 (GBP) 汇率短暂闪崩！", "GBP", 1.08},
	{"🦅 [FED] 美联储主席发表鹰派讲话，暗示年内不再降息，美元 (USD) 霸权指数坚挺。", "USD", 1.00},
	{"🟢 [RECOVERY] 欧亚贸易协定达成历史性突破，关税壁垒消除，多边市场情绪高涨！", "EUR", 0.98},
}

// StartOracleDaemon 启动后台守护进程 (Goroutine)
func StartOracleDaemon() {
	go func() {
		// 随机数种子
		r := rand.New(rand.NewSource(time.Now().UnixNano()))
		for {
			// 每隔 20 秒发生一次全球宏观事件 (为了演示效果加快了频率)
			time.Sleep(20 * time.Second)

			// 随机抽取一个事件
			event := eventPool[r.Intn(len(eventPool))]

			// 施加读写锁，修改内存中的全局变量
			mutex.Lock()
			CurrentNews = event.News
			NewsTime = time.Now()

			// 如果不是美元，则修改其汇率
			if event.Currency != "USD" {
				oldRate := FiatRates[event.Currency]
				newRate := oldRate * event.Multiplier
				FiatRates[event.Currency] = newRate
				fmt.Printf("🌍 [预言机广播] %s | %s 汇率从 %.2f 变动为 %.2f\n", event.News, event.Currency, oldRate, newRate)
			} else {
				fmt.Printf("🌍 [预言机广播] %s\n", event.News)
			}
			mutex.Unlock()
		}
	}()
}

// GetOracleData 提供给前端拉取实时汇率和新闻的接口
func GetOracleData(c *gin.Context) {
	mutex.RLock()
	defer mutex.RUnlock()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"rates": FiatRates,
			"news":  CurrentNews,
			"time":  NewsTime.Format("15:04:05 UTC"),
		},
	})
}
