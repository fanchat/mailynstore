from fpdf import FPDF
import os

DESKTOP = "/mnt/c/Users/ding/Desktop"

FONT_CN = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"
FONT_MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

class GuidePDF(FPDF):
    def __init__(self):
        super().__init__()
        self.add_font("CN", "", FONT_CN)
        self.add_font("CN", "B", FONT_CN)
        self.add_font("CN", "I", FONT_CN)
        self.add_font("MO", "", FONT_MONO)

    def header(self):
        if self.page_no() > 1:
            self.set_font("CN", "I", 8)
            self.set_text_color(150,150,150)
            self.cell(0, 6, "Mailyn.cn - 使用指南", align="R")
            self.ln(4)

    def footer(self):
        self.set_y(-12)
        self.set_font("CN", "I", 7)
        self.set_text_color(180,180,180)
        self.cell(0, 8, f"第{self.page_no()}页", align="C")

    def stitle(self, title):
        self.set_font("CN", "B", 16)
        self.set_text_color(41, 98, 255)
        self.ln(4)
        self.cell(0, 10, title, new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(41, 98, 255)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def sub(self, title):
        self.set_font("CN", "B", 12)
        self.set_text_color(60, 60, 60)
        self.ln(3)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

    def txt(self, text):
        self.set_font("CN", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, text)
        self.ln(1)

    def code(self, text):
        self.set_fill_color(245, 245, 245)
        self.set_draw_color(200, 200, 200)
        self.set_font("MO", "", 9)
        self.set_text_color(30, 30, 30)
        lines = text.split("\n")
        bh = len(lines) * 5 + 4
        ys = self.get_y()
        self.rect(self.l_margin, ys, self.w - 2 * self.l_margin, bh, style="DF")
        self.set_xy(self.l_margin + 3, ys + 2)
        for line in lines:
            self.cell(0, 5, line, new_x="LMARGIN", new_y="NEXT")
            self.set_x(self.l_margin + 3)
        self.ln(4)

    def bul(self, text, indent=10):
        x = self.get_x()
        self.set_x(x + indent)
        self.set_font("CN", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, "  -  " + text)
        self.ln(0)

    def trow(self, cells, widths, bold=False, fill=False):
        if fill:
            self.set_fill_color(230, 238, 255)
        self.set_font("CN", "B" if bold else "", 9)
        self.set_text_color(40, 40, 40)
        for i, cell in enumerate(cells):
            self.cell(widths[i], 7, cell, border=1, fill=fill)
        self.ln()


pdf = GuidePDF()
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True, margin=18)

# ===== 封面 =====
pdf.add_page()
pdf.ln(30)
pdf.set_font("CN", "B", 28)
pdf.set_text_color(41, 98, 255)
pdf.cell(0, 15, "Mailyn.cn", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.set_font("CN", "", 14)
pdf.set_text_color(100, 100, 100)
pdf.cell(0, 10, "使 用 指 南", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(5)
pdf.set_font("CN", "I", 11)
pdf.set_text_color(150, 150, 150)
pdf.cell(0, 8, "社交 + 商城平台，爸爸为你搭建", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(3)
pdf.cell(0, 8, "http://mailyn.cn:8000", align="C", new_x="LMARGIN", new_y="NEXT")
pdf.ln(30)
pdf.set_font("CN", "", 10)
pdf.set_text_color(120, 120, 120)
pdf.cell(0, 6, "2026年6月", align="C", new_x="LMARGIN", new_y="NEXT")

# ===== 正文 =====
pdf.add_page()
pdf.stitle("一、访问网站")
pdf.txt("在浏览器打开：")
pdf.code("http://mailyn.cn:8000")
pdf.txt("网站会自动进入 /dk/（丹麦区域）页面。")
pdf.txt("后续会加上 HTTPS 安全证书，暂时用 http 即可。")
pdf.ln(4)

pdf.stitle("二、注册与登录")
pdf.sub("注册新账号")
pdf.txt("首页 -> 右上角「账户」-> 底部「注册」-> 填写邮箱和密码")
pdf.bul("邮箱就是你的登录名，也是别人加你好友的标识")
pdf.bul("注册成功后自动登录，可以直接开始使用")

pdf.sub("登录")
pdf.txt("首页 -> 右上角「账户」-> 输入邮箱和密码")

pdf.sub("退出")
pdf.txt("首页 -> 右上角「账户」-> 进入个人中心 -> 退出按钮")
pdf.txt("或者直接关闭浏览器标签页，下次打开需要重新登录。")

pdf.stitle("三、商城购物")
pdf.txt("首页就是商城入口。浏览商品、加入购物车、下单。")
c = [45, 60]
pdf.trow(["页面", "操作方法"], c, bold=True, fill=True)
pdf.trow(["首页/商品", "http://mailyn.cn:8000/dk"], c)
pdf.trow(["购物车", "右上角购物车图标"], c)
pdf.trow(["结算下单", "购物车 -> 结算"], c)
pdf.ln(2)
pdf.txt("提示：支付功能（Stripe）还未对接，下单后不会扣款。")

pdf.stitle("四、社交功能（核心）")
pdf.txt("社交板块是网站的核心功能，从底部导航栏进入。")

pdf.sub("底部导航说明")
c2 = [30, 30, 110]
pdf.trow(["区域", "名称", "说明"], c2, bold=True, fill=True)
pdf.trow(["商城", "商城", "回到首页购物"], c2)
pdf.trow(["消息", "消息", "好友私信，红点=未读"], c2)
pdf.trow(["圈子", "圈子", "看大家的动态"], c2)
pdf.trow(["搜索", "搜索", "找人、找服务"], c2)
pdf.trow(["我的", "我的", "个人主页、私密帖"], c2)

pdf.sub("动态/帖子")
pdf.txt('进入「圈子」可以看到所有人的公开动态：')
pdf.bul("点赞 - 点爱心图标")
pdf.bul("评论 - 点气泡图标输入")
pdf.bul("发帖 - 点右下角 + 按钮")
pdf.txt("发帖时可以加文字、图片/视频，选择：公开 / 好友可见 / 仅自己")
pdf.ln(3)

pdf.sub("好友")
pdf.txt('圈子 -> 底部「好友」标签')
pdf.bul("输入对方邮箱搜索 -> 添加好友")
pdf.bul("查看好友列表")
pdf.bul("可删除好友")

pdf.sub("私信聊天")
pdf.txt("两种方式进入聊天：")
pdf.txt("1. 好友列表 -> 点好友名字 -> 发消息")
pdf.txt('2. 底部「消息」标签 -> 点对话')
pdf.bul("可发文字和图片")
pdf.bul("新消息有红色未读标记")

pdf.sub("个人主页")
pdf.txt('圈子 -> 底部「我的」')
pdf.txt("修改头像、昵称、签名，查看私密帖子。")

pdf.stitle("五、页面结构")
pdf.code("""http://mailyn.cn:8000
 /dk/                   首页/商城
 /dk/account            登录/注册/我的订单
 /dk/cart               购物车
 /dk/store              全部商品
 /dk/social             圈子(朋友圈)
   /social/friends      好友
   /social/messages     聊天列表
     /chat/[id]         跟好友聊天
   /social/search       找人
   /social/profile      我的主页
   /social/new-post     发新帖""")

pdf.stitle("六、后续计划")
pdf.bul("HTTPS 安全证书（浏览器显示小锁）")
pdf.bul("支付对接（Stripe）")
pdf.bul("德语界面")
pdf.bul("更完善的手机端体验")

# 保存
path = os.path.join(DESKTOP, "Mailyn_使用指南.pdf")
pdf.output(path)
print(f"已保存：{path}")
print(f"大小：{os.path.getsize(path):,} 字节")
