
class AiPredictor :


    def predict(self,df):
        return {"ML_Predictions" : {"GPD" : 0,	"GRDA" : 0,	"LPD" : 0,	"LRDA" : 0,	"Other" : 0,"Seizure" : 0},
                "DL_Predictions" : {"GPD" : 0,	"GRDA" : 0,	"LPD" : 0,	"LRDA" : 0,	"Other" : 0,"Seizure" : 0} }