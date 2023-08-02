package request

type GetInteractions struct {
	SrcIds []string `json:"src_ids" binding:"min=0,max=100,dive,min=1,max=64"`
	Start  uint     `json:"start"   binding:"ltefield=End"`
	End    uint     `json:"end"     binding:"gtfield=Start"`
	Limit  int      `json:"limit"   binding:"min=0,max=100000"`
	Offset int      `json:"offset"  binding:"min=0,max=1000"`
}
