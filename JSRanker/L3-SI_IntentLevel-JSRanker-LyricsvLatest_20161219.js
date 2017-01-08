// C: comments.
// 0:DomainAuthorityFeature_DUMultiInstanceUrlV2_0_4
// 1:DomainAuthorityFeature_DUMultiInstanceUrlV2_0_7
// 2:DomainAuthorityFeature_DUMultiInstanceUrlV2_0_5
// 3:DomainAuthorityFeature_DUMultiInstanceUrlV2_0_6
// 4:DomainAuthorityFeature_DUMultiInstanceUrlV2_0_8
// 5:UrlDepth
// 6:OnlineMemoryUrlFeature_0

//------------------------------------------------ DrugSideEffects Config - Begin ------------------------------------------------
var c_SubIntentId_LyricsSongLyrics = 201;
var c_SubIntentId_LyricsSongLyricsArtist = 202;


var intentMatchCondition = [];
intentMatchCondition[c_SubIntentId_LyricsSongLyrics] = [0, 2, 0];
intentMatchCondition[c_SubIntentId_LyricsSongLyricsArtist] = [0, 2, 0];


var constraintMatchCondition = [];
constraintMatchCondition[c_SubIntentId_LyricsSongLyrics] = [0, 1, 1, 1, 1];
constraintMatchCondition[c_SubIntentId_LyricsSongLyricsArtist] = [0, 1, 1, 1, 1];

//------------------------------------------------ DrugSideEffects Config - End ------------------------------------------------

//------------------------------------------------ Constant Define - Begin ------------------------------------------------
var c_subIntentIdQLF = 2662;
var c_subIntentScoreQLF = 2663;

//Feature Ids
var c_FeatureId_PEScoreTopSite = 0;
var c_FeatureId_PEScoreConstraint = 1;
var c_FeatureId_PEScoreGuarding = 2;
var c_FeatureId_PEScoreLowQuality = 3;
var c_FeatureId_PEScoreDiversity = 4;
var c_FeatureId_UrlDepth = 5;
var c_FeatureId_RankomaticScore = 6;

//Marker Ids
var c_MarkerId_WordCandidatePresence_MultiInstanceTitle = 9;
var c_MarkerId_WordCandidatePresence_Body = 11;

//Intermediate Feature Value
var c_officialSiteScore = 100;
var c_entityMatchScore_1st = 20000;
var c_entityMatchScore_2nd = 15000;
var c_entityMatchScore_3rd = 10000;
var c_entityMatchScore_4th = 5000;
var c_intentMatchScore_1st = 3000;
var c_intentMatchScore_2nd = 2000;
var c_intentMatchScore_3rd = 1000;
var c_constraintMatchScore_1st = 800;
var c_constraintMatchScore_2nd = 600;
var c_constraintMatchScore_3rd = 400;
var c_constraintMatchScore_4th = 200;
var c_constraintMatchScoreOpposed = 1;
var c_guardingScore = 1000;

// Postweb Slot Tagging Threshold
var c_PostwebConstraintTitleTop5Thres = 3;
var c_PostwebConstraintTitleTop10Thres = 5;
var c_PostwebConstraintBodyTop5Thres = 4;
var c_PostwebConstraintBodyTop10Thres = 8;

//Other Setting
var c_maxCaptionCharLength = 512;
var c_officialSiteDPThres = 5;
var c_entityMatchScoreThres_LB = 5000;//250;

// Stopwords used in PostWeb Slot Tagging
var c_stopWordsList = new Array("about", "an", "and", "are", "as", "at", "be", "but", "by", "com", "for", "from", "how", "if", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "was", "what", "when", "where", "which", "who", "will", "with", "would", "www", "a", "i", "your", "s");
//------------------------------------------------ Constant Define - End ------------------------------------------------

var msSemanticFrame;

if (!addquerylist.IsEmpty()) {
    for (var addquery = addquerylist.top; !addquery.IsNull() ; addquery = addquery.next) {
        if (addquery.name == "MSSemanticFrame") {
            msSemanticFrame = addquery.value;
            break;
        }
    }
}

var documentCount = documents.count;
if (IsNull(msSemanticFrame)) {
    for (var i = 0; i < documentCount; ++i) {
        documents[i].score = 1000.0 - i;
    }
}
else {
    var subIntentId = qlfs[c_subIntentIdQLF];
    var subIntentScore = qlfs[c_subIntentScoreQLF];

    var query = extractedquery;

    var MSSFDecodeResult = MSSFDecode(msSemanticFrame);
    var wordDropQuery = query.replace(/word:\((\w+)[^\)]+\)/g, "$1").replace(/rankonly:/g, "");
    var queryTermArray = wordDropQuery.split(" ");
    var queryTermDict = {};
    for (var i = 0, len = queryTermArray.length; i < len; i++) {
        var term = queryTermArray[i];
        if (IsNull(queryTermDict[term])) {
            queryTermDict[term] = i;
        }
    }

    var matchDataArray = [];
    for (var i = 0, len = documentCount; i < len; ++i) {
        var curDoc = documents[i];
        var marketVector = curDoc.markers;

        var title = curDoc.rawtitle;
        var url = curDoc.url;
        var snippet = curDoc.rawsnippet;

        title = IsNull(title) ? "" : StreamNormalization(title);
		url = IsNull(url) ? "" : url.toLowerCase().substring(0, c_maxCaptionCharLength);
		snippet = IsNull(snippet) ? "" : StreamNormalization(snippet);

        var wordFoundTitleArray = ParseWordCandidatePresence(marketVector[c_MarkerId_WordCandidatePresence_MultiInstanceTitle]);
        var wordFoundBodyArray = ParseWordCandidatePresence(marketVector[c_MarkerId_WordCandidatePresence_Body]);

        var matchData = new MatchData(title, url, snippet, wordFoundTitleArray, wordFoundBodyArray);
        matchDataArray.push(matchData);
    }
    MainRanker(subIntentId, subIntentScore, MSSFDecodeResult, matchDataArray, intentMatchCondition[subIntentId], constraintMatchCondition[subIntentId], documents,     documentCount);
	

}

//------------------------------------------------ MSSemanticFrame Decoder - Begin ------------------------------------------------
function MSSFDecode(addQuery) {
    var entity = [];
    var intent = [];
    var constraint = [];
    var urlKeyword = new UrlKeywordClass([], [], []);
    var guardingkeyword = [];
    var officialSite = [];
    var siteConstraint = [];
    var otherSlots = [];

    var items = addQuery.split(",");
    for (var i = 0, itemLen = items.length; i < itemLen; i++) {
        if (items[i] === "") {
            continue;
        }
        var keyValuePair = items[i].split(":");
        if (keyValuePair.length != 2) {
            continue;
        }
        if (keyValuePair[1] === "") {
            continue;
        }
        var key = keyValuePair[0];
        var value = keyValuePair[1];
        var j, len;
        if (key == "entity" || key == "Entity") {
            var entityListTemp = value.split("^");
			var entitySet = {};
            for (j = 0, len = entityListTemp.length; j < len; j++) {
                var entityItemArray = entityListTemp[j].split("&");
                var entityItemArrayLen = entityItemArray.length;
                if (entityItemArrayLen >= 1 && entityItemArray[0] === "") {
                    continue;
                }
				var entitySpan = entityItemArray[0];
				var entitySpanCode = GenerateHashCode(entitySpan);
				var entityScore = "1.0";
				if (IsNull(entitySet[entitySpanCode])) {
					if (entityItemArrayLen == 2) {
						entityScore = entityItemArray[1];
					}
					entity.push(new EntityClass(entitySpan, entityScore));
					entitySet[entitySpanCode] = 1;
				}	
            }
        }
        else if (key == "intent" || key == "Intent") {
            intent = value.split("|");
        }
        else if (key == "constraint" || key == "Constraint") {
            var constraintListTemp = value.split("^");
			var constraintSet = {};
            for (j = 0, len = constraintListTemp.length; j < len; j++) {
                var constraintItemArray = constraintListTemp[j].split("&");
                if (constraintItemArray.length != 4) {
                    continue;
                }
				var constraintOri = constraintItemArray[0];
				var constraintCode = GenerateHashCode(constraintOri);
				if (IsNull(constraintSet[constraintCode])) {
					constraint.push(new ConstraintClass(constraintOri, constraintItemArray[1].split("|"), constraintItemArray[2].split("|"), constraintItemArray[3].split("|")));
					constraintSet[constraintCode] = 1;
				}
            }
        }
        else if (key == "urlkeyword" || key == "UrlKeyword") {
            var urlKeywordListTemp = new Array("", "", "");
            var inputUrlKeyWordList = value.split("&", 3);
            for (j = 0, len = inputUrlKeyWordList.length; j < len; j++) {
                urlKeywordListTemp[i] = inputUrlKeyWordList[i];
            }
            urlKeyword = new UrlKeywordClass(urlKeywordListTemp[0].split("|"), urlKeywordListTemp[1].split("|"), urlKeywordListTemp[2].split("|"));
        }
        else if (key == "guarding" || key == "Guarding") {
            guardingkeyword = value.split("|");
        }
        else if (key == "officialsite" || key == "OfficialSite") {
            var officialSiteListTemp = value.split("^");
            for (j = 0, len = officialSiteListTemp.length; j < len; j++) {
                var officialSiteItemArray = officialSiteListTemp[j].split("&");
                if (officialSiteItemArray.length != 2) {
                    continue;
                }
                officialSite.push(new OfficialSiteClass(officialSiteItemArray[0], officialSiteItemArray[1]));
            }
        }
        else if (key == "siteconstraint" || key == "SiteConstraint") {
			var siteConstraintTemp = value.split("^");
			var siteConstraintSet = {};
			for (j = 0, len = siteConstraintTemp.length; j < len; j++) {
				var siteCons = siteConstraintTemp[j];
				var siteConsCode = GenerateHashCode(siteCons);
				if (IsNull(siteConstraintSet[siteConsCode])) {
					siteConstraint.push(siteCons);
					siteConstraintSet[siteConsCode] = 1;
				}
			}
        }
        else if (key == "otherslots" || key == "OtherSlots") {
            var otherSlotListTemp = value.split("^");
            for (j = 0, len = otherSlotListTemp.length; j < len; j++) {
                otherSlots.push(otherSlotListTemp[j]);
            }
        }
    }
    return new MSSFDecodeResult(entity, intent, constraint, urlKeyword, guardingkeyword, officialSite, siteConstraint, otherSlots);
}

function MSSFDecodeResult(entity, intent, constraint, urlKeyword, guardingkeyword, officialSite, siteConstraint, otherSlots) {
    this.entity = entity;
    this.intent = intent;
    this.constraint = constraint;
    this.urlKeyword = urlKeyword;
    this.guardingkeyword = guardingkeyword;
    this.officialSite = officialSite;
    this.siteConstraint = siteConstraint;
    this.otherSlots = otherSlots;
}

function EntityClass(text, score) {
    this.text = text;
    this.score = score;
}

function ConstraintClass(original, synonym, opposed, exclude) {
    this.original = original;
    this.synonym = synonym;
    this.opposed = opposed;
    this.exclude = exclude;
}

function UrlKeywordClass(keyword1, keyword2, keyword3) {
    this.keyword1 = keyword1;
    this.keyword2 = keyword2;
    this.keyword3 = keyword3;
}

function OfficialSiteClass(domainId, hostId) {
    this.domainId = domainId;
    this.hostId = hostId;
}
//------------------------------------------------ MSSemanticFrame Decoder - End ------------------------------------------------


//------------------------------------------------ Post-web Slot Tagging - Begin ------------------------------------------------
function PostWebSlotTagging(MSSFDecodeResult, query, matchDataArray) {
    var filterTermDict = {};
    var i, j, len, code, termCount, termArray;
	var stopWordsList = c_stopWordsList;
	for (i = 0, len = stopWordsList.length; i < len; i++) {
        code = GenerateHashCode(stopWordsList[i]);
        filterTermDict[code] = 1;
    }
    for (i = 0, len = MSSFDecodeResult.entity.length; i < len; i++) {
        termArray = MSSFDecodeResult.entity[i].text.split(' ');
        for (j = 0, termCount = termArray.length; j < termCount; j++) {
            code = GenerateHashCode(termArray[j]);
            filterTermDict[code] = 1;
        }
    }
    for (i = 0, len = MSSFDecodeResult.constraint.length; i < len; i++) {
        termArray = MSSFDecodeResult.constraint[i].original.split(' ');
        for (j = 0, termCount = termArray.length; j < termCount; j++) {
            code = GenerateHashCode(termArray[j]);
            filterTermDict[code] = 1;
        }
    }
    for (i = 0, len = MSSFDecodeResult.siteConstraint.length; i < len; i++) {
        termArray = MSSFDecodeResult.siteConstraint[i].split(' ');
        for (j = 0, termCount = termArray.length; j < termCount; j++) {
            code = GenerateHashCode(termArray[j]);
            filterTermDict[code] = 1;
        }
    }
    for (i = 0, len = MSSFDecodeResult.otherSlots.length; i < len; i++) {
        termArray = MSSFDecodeResult.otherSlots[i].split(' ');
        for (j = 0, termCount = termArray.length; j < termCount; j++) {
            code = GenerateHashCode(termArray[j]);
            filterTermDict[code] = 1;
        }
    }

    var candidateListTemp = query.split(' ');
    var candidateList = [];
    for (i = 0, len = candidateListTemp.length; i < len; i++) {
        var candidate = candidateListTemp[i];
        if (candidate !== "" && IsNull(filterTermDict[GenerateHashCode(candidate)])) {
            candidateList.push(new CandidateTermClass(candidate));
        }
    }

    var maxDRScore = 0;
    var drScoreTop1MatchData = matchDataArray[0];
    var top1MatchData = matchDataArray[0];
    var candCount = candidateList.length;
    var curCandidate, curCandTerm;
    for (i = 0, len = documentCount; i < len; ++i) {
        if (i >= 10) {
            break;
        }
        var matchData = matchDataArray[i];
        for (j = 0; j < candCount; j++) {
            curCandidate = candidateList[j];
            curCandTerm = curCandidate.term;
            var isCandidateMatchTitle = WordsFoundForTitleSnippet(curCandTerm, matchData.wordFoundTitleArray, matchData.title) == 1;
            var isCandidateMatchSnippet = WordsFoundForTitleSnippet(curCandTerm, matchData.wordFoundBodyArray, matchData.snippet) == 1;

            if (isCandidateMatchTitle) {
                if (i < 5) {
                    curCandidate.titleTop5Count++;
                }
                curCandidate.titleTop10Count++;
            }
            if (isCandidateMatchSnippet) {
                if (i < 5) {
                    curCandidate.bodyTop5Count++;
                }
                curCandidate.bodyTop10Count++;
            }
        }

        var drScore = documents[i].l2score;
        if (drScore > maxDRScore) {
            maxDRScore = drScore;
            drScoreTop1MatchData = matchData;
        }
    }

    //for (j = 0; j < candCount; j++) {
    //    curCandidate = candidateList[j];
    //    if (curCandidate.titleTop5Count >= c_PostwebConstraintTitleTop5Thres || curCandidate.titleTop10Count >= c_PostwebConstraintTitleTop10Thres || curCandidate.bodyTop5Count >= c_PostwebConstraintBodyTop5Thres || curCandidate.bodyTop10Count >= c_PostwebConstraintBodyTop10Thres) {
    //        curCandTerm = curCandidate.term;
    //        if (WordsFoundForTitleSnippet(curCandTerm, top1MatchData.wordFoundTitleArray, top1MatchData.title) == 1 && WordsFoundForTitleSnippet(curCandTerm, drScoreTop1MatchData.wordFoundTitleArray, drScoreTop1MatchData.title) == 1) {
    //            MSSFDecodeResult.constraint.push(new ConstraintClass(curCandTerm, "", "", ""));
    //        }
    //    }
    //}
    //return MSSFDecodeResult;
	
	for (j = 0; j < candCount; j++) {
        curCandidate = candidateList[j];
        if (curCandidate.titleTop5Count >= c_PostwebConstraintTitleTop5Thres || curCandidate.titleTop10Count >= c_PostwebConstraintTitleTop10Thres || curCandidate.bodyTop5Count >= c_PostwebConstraintBodyTop5Thres || curCandidate.bodyTop10Count >= c_PostwebConstraintBodyTop10Thres) {
            curCandTerm = curCandidate.term;
            MSSFDecodeResult.constraint.push(new ConstraintClass(curCandTerm, "", "", ""));
        }
    }
    return MSSFDecodeResult; 
}

function CandidateTermClass(term) {
    this.term = term;
    this.titleTop5Count = 0;
    this.titleTop10Count = 0;
    this.bodyTop10Count = 0;
    this.bodyTop5Count = 0;
}
//------------------------------------------------ Post-web Slot Tagging - End ------------------------------------------------


//------------------------------------------------ PEScore Decoder - Begin ------------------------------------------------
function PETopSiteScoreDecode(PETopSiteScore, urlKeyword, url, urlPathDepth) {
    var scoreTemp = PETopSiteScore;
    var basicSection = PETopSiteScoreBasicSectionDecode(scoreTemp);
    var result = new PETopSiteScoreDecodeResult(basicSection.score, basicSection.isSpecific, basicSection.isIntent);

    var keyword1 = urlKeyword.keyword1;
    var keyword2 = urlKeyword.keyword2;
    var keyword3 = urlKeyword.keyword3;

    scoreTemp = scoreTemp >>> 6;
    if (scoreTemp > 0) {
        var extendSection1 = PETopSiteScoreExtendSectionDecode(scoreTemp);
        var isExtend1 = true;
        if (extendSection1.pathDepth > 0 && extendSection1.pathDepth != urlPathDepth) {
            isExtend1 = false;
        }
        if (isExtend1 && extendSection1.keyWordMatch1 == 1 && !IsArrayPhraseMatchForUrl(keyword1, url)) {
            isExtend1 = false;
        }
        if (isExtend1 && extendSection1.keyWordMatch2 == 1 && !IsArrayPhraseMatchForUrl(keyword2, url)) {
            isExtend1 = false;
        }
        if (isExtend1 && extendSection1.keyWordMatch3 == 1 && !IsArrayPhraseMatchForUrl(keyword3, url)) {
            isExtend1 = false;
        }
        if (isExtend1) {
            result = new PETopSiteScoreDecodeResult(extendSection1.score, extendSection1.isSpecific, extendSection1.isIntent);
        }
        else {
            scoreTemp = scoreTemp >>> 12;
            if (scoreTemp > 0) {
                var extendSection2 = PETopSiteScoreExtendSectionDecode(scoreTemp);
                var isExtend2 = true;
                if (extendSection2.pathDepth > 0 && extendSection2.pathDepth != urlPathDepth) {
                    isExtend2 = false;
                }
                if (isExtend2 && extendSection2.keyWordMatch1 == 1 && !IsArrayPhraseMatchForUrl(keyword1, url)) {
                    isExtend2 = false;
                }
                if (isExtend2 && extendSection2.keyWordMatch2 == 1 && !IsArrayPhraseMatchForUrl(keyword2, url)) {
                    isExtend2 = false;
                }
                if (isExtend2 && extendSection2.keyWordMatch3 == 1 && !IsArrayPhraseMatchForUrl(keyword3, url)) {
                    isExtend2 = false;
                }
                if (isExtend2) {
                    result = new PETopSiteScoreDecodeResult(extendSection2.score, extendSection2.isSpecific, extendSection2.isIntent);
                }
            }
        }
    }
    return result;
}

function PETopSiteScoreBasicSectionDecode(score) {
	
    var scoreTemp = score;
    var isSpecificBasic = scoreTemp & 1;

    scoreTemp = scoreTemp >>> 1;
    var isIntentBasic = scoreTemp & 1;

    scoreTemp = scoreTemp >>> 1;
    var scoreBasic = scoreTemp & 15;

    return new PETopSiteScoreBasicSection(scoreBasic, isSpecificBasic, isIntentBasic);
}

function PETopSiteScoreExtendSectionDecode(score) {
    var scoreTemp = score;
    var PETopSiteScoreBasicSectionTemp = PETopSiteScoreBasicSectionDecode(scoreTemp);
    scoreTemp = scoreTemp >>> 6;
    var pathDepth = scoreTemp & 7;

    scoreTemp = scoreTemp >>> 3;
    var keyWordMatch1 = scoreTemp & 1;

    scoreTemp = scoreTemp >>> 1;
    var keyWordMatch2 = scoreTemp & 1;

    scoreTemp = scoreTemp >>> 1;
    var keyWordMatch3 = scoreTemp & 1;

    return new PETopSiteScoreExtendSection(PETopSiteScoreBasicSectionTemp.score, PETopSiteScoreBasicSectionTemp.isSpecific, PETopSiteScoreBasicSectionTemp.isIntent, keyWordMatch1, keyWordMatch2, keyWordMatch3, pathDepth);
}

function PETopSiteScoreDecodeResult(authorityScore, isSpecific, isIntent) {
    this.authorityScore = authorityScore;
    this.isSpecific = isSpecific;
    this.isIntent = isIntent;
}

function PETopSiteScoreBasicSection(score, isSpecific, isIntent) {
    this.score = score;
    this.isSpecific = isSpecific;
    this.isIntent = isIntent;
}

function PETopSiteScoreExtendSection(score, isSpecific, isIntent, keyWordMatch1, keyWordMatch2, keyWordMatch3, pathDepth) {
    this.score = score;
    this.isSpecific = isSpecific;
    this.isIntent = isIntent;
    this.keyWordMatch1 = keyWordMatch1;
    this.keyWordMatch2 = keyWordMatch2;
    this.keyWordMatch3 = keyWordMatch3;
    this.pathDepth = pathDepth;
}

function PEConstraintScoreDecode(PEConstraintScore, urlKeyword, url, urlPathDepth) {
    var scoreTemp = PEConstraintScore;
    var basicScore = scoreTemp & 3;
    var result = basicScore;

    var keyword1 = urlKeyword.keyword1;
    var keyword2 = urlKeyword.keyword2;
    var keyword3 = urlKeyword.keyword3;

    scoreTemp = scoreTemp >>> 2;
    if (scoreTemp > 0) {
        var extendSection1 = PEConstraintScoreExtendSectionDecode(scoreTemp);
        var isExtend1 = true;
        if (extendSection1.pathDepth > 0 && extendSection1.pathDepth != urlPathDepth) {
            isExtend1 = false;
        }
        if (isExtend1 && extendSection1.keyWordMatch1 == 1 && !IsArrayPhraseMatchForUrl(keyword1, url)) {
            isExtend1 = false;
        }
        if (isExtend1 && extendSection1.keyWordMatch2 == 1 && !IsArrayPhraseMatchForUrl(keyword2, url)) {
            isExtend1 = false;
        }
        if (isExtend1 && extendSection1.keyWordMatch3 == 1 && !IsArrayPhraseMatchForUrl(keyword3, url)) {
            isExtend1 = false;
        }
        if (isExtend1) {
            result = extendSection1.score;
        }
        else {
            scoreTemp = scoreTemp >>> 8;
            if (scoreTemp > 0) {
                var extendSection2 = PEConstraintScoreExtendSectionDecode(scoreTemp);
                var isExtend2 = true;
                if (extendSection2.pathDepth > 0 && extendSection2.pathDepth != urlPathDepth) {
                    isExtend2 = false;
                }
                if (isExtend2 && extendSection2.keyWordMatch1 == 1 && !IsArrayPhraseMatchForUrl(keyword1, url)) {
                    isExtend2 = false;
                }
                if (isExtend2 && extendSection2.keyWordMatch2 == 1 && !IsArrayPhraseMatchForUrl(keyword2, url)) {
                    isExtend2 = false;
                }
                if (isExtend2 && extendSection2.keyWordMatch3 == 1 && !IsArrayPhraseMatchForUrl(keyword3, url)) {
                    isExtend2 = false;
                }
                if (isExtend2) {
                    result = extendSection2.score;
                }
            }
        }
    }
    return result;
}

function PEConstraintScoreExtendSectionDecode(score) {
    var scoreTemp = score;
    var PEConstraintScore = scoreTemp & 3;
    scoreTemp = scoreTemp >>> 2;
    var pathDepth = scoreTemp & 7;

    scoreTemp = scoreTemp >>> 3;
    var keyWordMatch1 = scoreTemp & 1;

    scoreTemp = scoreTemp >>> 1;
    var keyWordMatch2 = scoreTemp & 1;

    scoreTemp = scoreTemp >>> 1;
    var keyWordMatch3 = scoreTemp & 1;

    return new PEConstraintScoreExtendSection(PEConstraintScore, keyWordMatch1, keyWordMatch2, keyWordMatch3, pathDepth);
}

function PEConstraintScoreExtendSection(score, keyWordMatch1, keyWordMatch2, keyWordMatch3, pathDepth) {
    this.score = score;
    this.keyWordMatch1 = keyWordMatch1;
    this.keyWordMatch2 = keyWordMatch2;
    this.keyWordMatch3 = keyWordMatch3;
    this.pathDepth = pathDepth;
}
//------------------------------------------------ PEScore Decoder - End ------------------------------------------------


//------------------------------------------------ Generate Entity Matching Feature - Begin ------------------------------------------------
function GenerateEntityMatchingScore(entityList, matchData) {
    var entityMatchFeature = 0;
    var entityCount = entityList.length;

    var title = matchData.title;
    var wordFoundTitleArray = matchData.wordFoundTitleArray;
    var snippet = matchData.snippet;
    var wordFoundBodyArray = matchData.wordFoundBodyArray;

	
    for (var i = 0; i < entityCount; i++) {
        var entityItem = entityList[i];
        var entity = entityItem.text;
        if (entityItem.score >= 1.0) {
            if (entity.indexOf(' ') != -1) {
                if (IsPhraseMatchForTitleSnippet(entity, title)) {
                    entityMatchFeature += c_entityMatchScore_1st;
                }
                else if (IsPhraseMatchForTitleSnippet(entity, snippet)) {
                    entityMatchFeature += c_entityMatchScore_2nd;
                }
                else if (WordsFoundForTitleSnippet(entity, wordFoundTitleArray, title) == 1) {
                    entityMatchFeature += c_entityMatchScore_3rd;
                }
                else if (WordsFoundForTitleSnippet(entity, wordFoundBodyArray, snippet) == 1) {
                    entityMatchFeature += c_entityMatchScore_4th;
                }
            }
            else {
                if (WordsFoundForTitleSnippet(entity, wordFoundTitleArray, title) == 1) {
                    entityMatchFeature += c_entityMatchScore_1st;
                }
                else if (WordsFoundForTitleSnippet(entity, wordFoundBodyArray, snippet) == 1) {
                    entityMatchFeature += c_entityMatchScore_2nd;
                }
            }
        }
        else {
            entityMatchFeature += WordsFoundForTitleSnippet(MSSFDecodeResult.entity1, wordFoundTitleArray, title);
        }
    }

    if (entityCount !== 0) {
        entityMatchFeature = entityMatchFeature / entityCount;
    }
    return NormalizeEntityMatchingScore(entityMatchFeature);
}

function NormalizeEntityMatchingScore(score) {
    if (score == c_entityMatchScore_1st) {
        return c_entityMatchScore_1st;
    }
    else if (score > (c_entityMatchScore_1st / 3 * 2)) {
        return c_entityMatchScore_2nd;
    }
    else if (score > (c_entityMatchScore_1st / 3)) {
        return c_entityMatchScore_3rd;
    }
    else if (score > 0) {
        return c_entityMatchScore_4th;
    }
    else {
        return 0;
    }
}
//------------------------------------------------ Generate Entity Matching Feature - End ------------------------------------------------


//------------------------------------------------ Generate Intent Matching Feature - Begin ------------------------------------------------
function GenerateIntentMatchingScore(intentMatchConditionArray, intent, matchData, isIntentMatchUrl) {
    if (IsNull(intentMatchConditionArray) || intentMatchConditionArray.length != 3) {
        return 0;
    }

    var title = matchData.title;
    //Verify whether is condition0 match
    var isCondition0Match = false;
    switch (intentMatchConditionArray[0]) {
        case 0:
            isCondition0Match = false;
            break;
        case 1:
            isCondition0Match = true;
            break;
        case 2:
            if (IsArrayPhraseMatchForTitleSnippet(intent, title) || isIntentMatchUrl == 1) {
                isCondition0Match = true;
            }
            else {
                isCondition0Match = false;
            }
            break;
        default:
            isCondition0Match = false;
            break;
    }
    if (isCondition0Match) {
        return c_intentMatchScore_1st;
    }

    //Verify whether is condition1 match
    var isCondition1Match = false;
    switch (intentMatchConditionArray[1]) {
        case 0:
            isCondition1Match = false;
            break;
        case 1:
            isCondition1Match = true;
            break;
        case 2:
            if (IsArrayPhraseMatchForTitleSnippet(intent, title) || isIntentMatchUrl == 1) {
                isCondition1Match = true;
            }
            else {
                isCondition1Match = false;
            }
            break;
        default:
            isCondition1Match = false;
            break;
    }
    if (isCondition1Match) {
        return c_intentMatchScore_2nd;
    }

    //Verify whether is condition2 match
    var isCondition2Match = false;
    switch (intentMatchConditionArray[2]) {
        case 0:
            isCondition2Match = false;
            break;
        case 1:
            isCondition2Match = true;
            break;
        case 2:
            if (IsArrayPhraseMatchForTitleSnippet(intent, title) || isIntentMatchUrl == 1) {
                isCondition2Match = true;
            }
            else {
                isCondition2Match = false;
            }
            break;
        default:
            isCondition2Match = false;
            break;
    }
    if (isCondition2Match) {
        return c_intentMatchScore_3rd;
    }
    return 0;
}
//------------------------------------------------ Generate Intent Matching Feature - End ------------------------------------------------


//------------------------------------------------ Generate Constraint Matching Feature - Begin ------------------------------------------------
function GenerateConstraintMatchingScore(constraintMatchConditionArray, constraintList, matchData, authorityScore, constraintMatchUrlScore, documentPosition) {
    var consMatchFeature = 0;
    var hasOpposed = false;
    var consCount = constraintList.length;
    for (var i = 0; i < consCount; i++) {
        var consMatchForOne = CalculateConstraintMatchingScoreForSingleConstraint(constraintMatchConditionArray, constraintList[i], matchData, authorityScore, constraintMatchUrlScore, documentPosition);
        consMatchFeature += consMatchForOne;
        if (consMatchForOne == 1) {
            hasOpposed = true;
        }
    }

    if (hasOpposed) {
        consMatchFeature = 1;
    }
    else if (consCount !== 0) {
        consMatchFeature = consMatchFeature / consCount;
    }

    return NormalizeConstraintMatchingScore(consMatchFeature);
}

function CalculateConstraintMatchingScoreForSingleConstraint(constraintMatchConditionArray, constraint, matchData, authorityScore, constraintMatchUrlScore, documentPosition) {
    if (IsNull(constraintMatchConditionArray) || constraintMatchConditionArray.length != 5) {
        return 0;
    }

    var consOri = constraint.original;
    var consSyno = constraint.synonym;
    var consOpposed = constraint.opposed;
    var consExclude = constraint.exclude;

    var url = matchData.url;
    var title = matchData.title;
    var snippet = matchData.snippet;
    var wordFoundTitleArray = matchData.wordFoundTitleArray;
    var wordFoundBodyArray = matchData.wordFoundBodyArray;

    var isConsOriMatchTitle;
    var isConsOriMatchUrl;
    var isConsOriMatchBody;

    var isConsSynoMatchTitle;
    var isConsSynoMatchUrl;
    var isConsSynoMatchBody;

    var isConsOpposedMatchTitle;
    var isConsOpposedMatchUrl;

    var isConsExcludeMatchBody;

    //Verify whether is condition0 match
    var isCondition0Match = false;     //Opposed match
    switch (constraintMatchConditionArray[0]) {
        case 0:
            isCondition0Match = false;
            break;
        case 1:
            isCondition0Match = true;
            break;
        case 2:
            if (IsNull(isConsOriMatchTitle)) {
                isConsOriMatchTitle = WordsFoundForTitleSnippet(consOri, wordFoundTitleArray, title) == 1;
            }
            if (isConsOriMatchTitle) {
                break;
            }
            if (IsNull(isConsOpposedMatchTitle)) {
                isConsOpposedMatchTitle = IsArrayPhraseMatchForTitleSnippet(consOpposed, title);
            }
            if (isConsOpposedMatchTitle) {
                isCondition0Match = true;
            }
            break;
        case 3:
            if (IsNull(isConsOriMatchTitle)) {
                isConsOriMatchTitle = WordsFoundForTitleSnippet(consOri, wordFoundTitleArray, title) == 1;
            }
            if (isConsOriMatchTitle) {
                break;
            }
            if (IsNull(isConsOriMatchUrl)) {
                isConsOriMatchUrl = IsPhraseMatchForUrl(consOri, url);
            }
            if (isConsOriMatchUrl) {
                break;
            }
            if (IsNull(isConsOpposedMatchTitle)) {
                isConsOpposedMatchTitle = IsArrayPhraseMatchForTitleSnippet(consOpposed, title);
            }
            if (isConsOpposedMatchTitle) {
                isCondition0Match = true;
                break;
            }
            if (IsNull(isConsOpposedMatchUrl)) {
                isConsOpposedMatchUrl = IsArrayPhraseMatchForUrl(consOpposed, url);
            }
            if (isConsOpposedMatchUrl) {
                isCondition0Match = true;
            }
            break;
        default:
            isCondition0Match = false;
            break;
    }
    if (isCondition0Match) {
        return c_constraintMatchScoreOpposed;
    }

    //Verify whether is condition1 match
    var isCondition1Match = false;
    switch (constraintMatchConditionArray[1]) {
        case 0:
            isCondition1Match = false;
            break;
        case 1:
            isCondition1Match = true;
            break;
        case 2:
            if (constraintMatchUrlScore != 1 && authorityScore != c_officialSiteScore) {
                break;
            }
            if (IsNull(isConsOriMatchTitle)) {
                isConsOriMatchTitle = WordsFoundForTitleSnippet(consOri, wordFoundTitleArray, title) == 1;
            }
            if (isConsOriMatchTitle) {
                isCondition1Match = true;
                break;
            }
            if (IsNull(isConsSynoMatchTitle)) {
                isConsSynoMatchTitle = IsArrayPhraseMatchForTitleSnippet(consSyno, title);
            }
            if (isConsSynoMatchTitle) {
                isCondition1Match = true;
            }
            break;
        case 3:
            if (constraintMatchUrlScore != 1 && authorityScore != c_officialSiteScore) {
                break;
            }
            if (IsNull(isConsOriMatchTitle)) {
                isConsOriMatchTitle = WordsFoundForTitleSnippet(consOri, wordFoundTitleArray, title) == 1;
            }
            if (isConsOriMatchTitle) {
                isCondition1Match = true;
                break;
            }
            if (IsNull(isConsOriMatchUrl)) {
                isConsOriMatchUrl = IsPhraseMatchForUrl(consOri, url);
            }
            if (isConsOriMatchUrl) {
                isCondition1Match = true;
                break;
            }
            if (IsNull(isConsSynoMatchTitle)) {
                isConsSynoMatchTitle = IsArrayPhraseMatchForTitleSnippet(consSyno, title);
            }
            if (isConsSynoMatchTitle) {
                isCondition1Match = true;
                break;
            }
            if (IsNull(isConsSynoMatchUrl)) {
                isConsSynoMatchUrl = IsArrayPhraseMatchForUrl(consSyno, url);
            }
            if (isConsSynoMatchUrl) {
                isCondition1Match = true;
            }
            break;
        default:
            isCondition1Match = false;
            break;
    }
    if (isCondition1Match) {
        return c_constraintMatchScore_1st;
    }

    //Verify whether is condition2 match
    var isCondition2Match = false;
    switch (constraintMatchConditionArray[2]) {
        case 0:
            isCondition2Match = false;
            break;
        case 1:
            isCondition2Match = true;
            break;
        case 2:
            if (constraintMatchUrlScore == 1 || authorityScore == c_officialSiteScore) {
                if (IsNull(isConsOpposedMatchTitle)) {
                    isConsOpposedMatchTitle = IsArrayPhraseMatchForTitleSnippet(consOpposed, title);
                }
                if (isConsOpposedMatchTitle) {
                    break;
                }
                if (IsNull(isConsExcludeMatchBody)) {
                    isConsExcludeMatchBody = IsArrayPhraseMatchForTitleSnippet(consExclude, snippet);
                }
                if (isConsExcludeMatchBody) {
                    break;
                }
                if (IsNull(isConsOriMatchBody)) {
                    isConsOriMatchBody = WordsFoundForTitleSnippet(consOri, wordFoundBodyArray, snippet) == 1;
                }
                if (isConsOriMatchBody) {
                    isCondition2Match = true;
                    break;
                }
                if (IsNull(isConsSynoMatchBody)) {
                    isConsSynoMatchBody = IsArrayPhraseMatchForTitleSnippet(consSyno, snippet);
                }
                if (isConsSynoMatchBody) {
                    isCondition2Match = true;
                    break;
                }
            }
            else if (constraintMatchUrlScore == 2) {
                if (IsNull(isConsOriMatchTitle)) {
                    isConsOriMatchTitle = WordsFoundForTitleSnippet(consOri, wordFoundTitleArray, title) == 1;
                }
                if (isConsOriMatchTitle) {
                    isCondition2Match = true;
                    break;
                }
                if (IsNull(isConsSynoMatchTitle)) {
                    isConsSynoMatchTitle = IsArrayPhraseMatchForTitleSnippet(consSyno, title);
                }
                if (isConsSynoMatchTitle) {
                    isCondition2Match = true;
                    break;
                }
            }
            break;
        case 3:
            if (constraintMatchUrlScore == 1 || authorityScore == c_officialSiteScore) {
                if (IsNull(isConsOpposedMatchTitle)) {
                    isConsOpposedMatchTitle = IsArrayPhraseMatchForTitleSnippet(consOpposed, title);
                }
                if (isConsOpposedMatchTitle) {
                    break;
                }
                if (IsNull(isConsOpposedMatchUrl)) {
                    isConsOpposedMatchUrl = IsArrayPhraseMatchForUrl(consOpposed, url);
                }
                if (isConsOpposedMatchUrl) {
                    break;
                }
                if (IsNull(isConsExcludeMatchBody)) {
                    isConsExcludeMatchBody = IsArrayPhraseMatchForTitleSnippet(consExclude, snippet);
                }
                if (isConsExcludeMatchBody) {
                    break;
                }
                if (IsNull(isConsOriMatchBody)) {
                    isConsOriMatchBody = WordsFoundForTitleSnippet(consOri, wordFoundBodyArray, snippet) == 1;
                }
                if (isConsOriMatchBody) {
                    isCondition2Match = true;
                    break;
                }
                if (IsNull(isConsSynoMatchBody)) {
                    isConsSynoMatchBody = IsArrayPhraseMatchForTitleSnippet(consSyno, snippet);
                }
                if (isConsSynoMatchBody) {
                    isCondition2Match = true;
                    break;
                }
            }
            else if (constraintMatchUrlScore == 2) {
                if (IsNull(isConsOriMatchTitle)) {
                    isConsOriMatchTitle = WordsFoundForTitleSnippet(consOri, wordFoundTitleArray, title) == 1;
                }
                if (isConsOriMatchTitle) {
                    isCondition2Match = true;
                    break;
                }
                if (IsNull(isConsOriMatchUrl)) {
                    isConsOriMatchUrl = IsPhraseMatchForUrl(consOri, url);
                }
                if (isConsOriMatchUrl) {
                    isCondition2Match = true;
                    break;
                }
                if (IsNull(isConsSynoMatchTitle)) {
                    isConsSynoMatchTitle = IsArrayPhraseMatchForTitleSnippet(consSyno, title);
                }
                if (isConsSynoMatchTitle) {
                    isCondition2Match = true;
                    break;
                }
                if (IsNull(isConsSynoMatchUrl)) {
                    isConsSynoMatchUrl = IsArrayPhraseMatchForUrl(consSyno, url);
                }
                if (isConsSynoMatchUrl) {
                    isCondition2Match = true;
                    break;
                }
            }
            break;
        default:
            isCondition2Match = false;
            break;
    }
    if (isCondition2Match) {
        return c_constraintMatchScore_2nd;
    }

    //Verify whether is condition3 match
    var isCondition3Match = false;
    switch (constraintMatchConditionArray[3]) {
        case 0:
            isCondition3Match = false;
            break;
        case 1:
            isCondition3Match = true;
            break;
        case 2:
            if (documentPosition >= 5) {
                break;
            }
            if (IsNull(isConsOriMatchTitle)) {
                isConsOriMatchTitle = WordsFoundForTitleSnippet(consOri, wordFoundTitleArray, title) == 1;
            }
            if (isConsOriMatchTitle) {
                isCondition3Match = true;
                break;
            }
            if (IsNull(isConsSynoMatchTitle)) {
                isConsSynoMatchTitle = IsArrayPhraseMatchForTitleSnippet(consSyno, title);
            }
            if (isConsSynoMatchTitle) {
                isCondition3Match = true;
            }
            break;
        case 3:
            if (documentPosition >= 5) {
                break;
            }
            if (IsNull(isConsOriMatchTitle)) {
                isConsOriMatchTitle = WordsFoundForTitleSnippet(consOri, wordFoundTitleArray, title) == 1;
            }
            if (isConsOriMatchTitle) {
                isCondition3Match = true;
                break;
            }
            if (IsNull(isConsOriMatchUrl)) {
                isConsOriMatchUrl = IsPhraseMatchForUrl(consOri, url);
            }
            if (isConsOriMatchUrl) {
                isCondition3Match = true;
                break;
            }
            if (IsNull(isConsSynoMatchTitle)) {
                isConsSynoMatchTitle = IsArrayPhraseMatchForTitleSnippet(consSyno, title);
            }
            if (isConsSynoMatchTitle) {
                isCondition3Match = true;
            }
            if (IsNull(isConsSynoMatchUrl)) {
                isConsSynoMatchUrl = IsArrayPhraseMatchForUrl(consSyno, url);
            }
            if (isConsSynoMatchUrl) {
                isCondition3Match = true;
            }
            break;
        default:
            isCondition3Match = false;
            break;
    }
    if (isCondition3Match) {
        return c_constraintMatchScore_3rd;
    }

    //Verify whether is condition4 match
    var isCondition4Match = false;
    switch (constraintMatchConditionArray[4]) {
        case 0:
            isCondition4Match = false;
            break;
        case 1:
            isCondition4Match = true;
            break;
        case 2:
            if (documentPosition >= 5) {
                break;
            }
            if (IsNull(isConsOpposedMatchTitle)) {
                isConsOpposedMatchTitle = IsArrayPhraseMatchForTitleSnippet(consOpposed, title);
            }
            if (isConsOpposedMatchTitle) {
                break;
            }
            if (IsNull(isConsExcludeMatchBody)) {
                isConsExcludeMatchBody = IsArrayPhraseMatchForTitleSnippet(consExclude, snippet);
            }
            if (isConsExcludeMatchBody) {
                break;
            }
            if (IsNull(isConsOriMatchBody)) {
                isConsOriMatchBody = WordsFoundForTitleSnippet(consOri, wordFoundBodyArray, snippet) == 1;
            }
            if (isConsOriMatchBody) {
                isCondition4Match = true;
                break;
            }
            if (IsNull(isConsSynoMatchBody)) {
                isConsSynoMatchBody = IsArrayPhraseMatchForTitleSnippet(consSyno, snippet);
            }
            if (isConsSynoMatchBody) {
                isCondition4Match = true;
                break;
            }
            break;
        case 3:
            if (documentPosition >= 5) {
                break;
            }
            if (IsNull(isConsOpposedMatchTitle)) {
                isConsOpposedMatchTitle = IsArrayPhraseMatchForTitleSnippet(consOpposed, title);
            }
            if (isConsOpposedMatchTitle) {
                break;
            }
            if (IsNull(isConsOpposedMatchUrl)) {
                isConsOpposedMatchUrl = IsArrayPhraseMatchForUrl(consOpposed, url);
            }
            if (isConsOpposedMatchUrl) {
                break;
            }
            if (IsNull(isConsExcludeMatchBody)) {
                isConsExcludeMatchBody = IsArrayPhraseMatchForTitleSnippet(consExclude, snippet);
            }
            if (isConsExcludeMatchBody) {
                break;
            }
            if (IsNull(isConsOriMatchBody)) {
                isConsOriMatchBody = WordsFoundForTitleSnippet(consOri, wordFoundBodyArray, snippet) == 1;
            }
            if (isConsOriMatchBody) {
                isCondition4Match = true;
                break;
            }
            if (IsNull(isConsSynoMatchBody)) {
                isConsSynoMatchBody = IsArrayPhraseMatchForTitleSnippet(consSyno, snippet);
            }
            if (isConsSynoMatchBody) {
                isCondition4Match = true;
                break;
            }
            break;
        default:
            isCondition4Match = false;
            break;
    }
    if (isCondition4Match) {
        return c_constraintMatchScore_4th;
    }
    return 0;
}

function NormalizeConstraintMatchingScore(score) {
    if (score == c_constraintMatchScore_1st) {
        return c_constraintMatchScore_1st;
    }
    else if (score > (c_constraintMatchScore_1st / 3 * 2)) {
        return c_constraintMatchScore_2nd;
    }
    else if (score > (c_constraintMatchScore_1st / 3)) {
        return c_constraintMatchScore_3rd;
    }
    else if (score > 1) {
        return c_constraintMatchScore_4th;
    }
    else if (score == c_constraintMatchScoreOpposed) {
        return c_constraintMatchScoreOpposed;
    }
    else {
        return 0;
    }
}
//------------------------------------------------ Generate Constraint Matching Feature - End ------------------------------------------------


//------------------------------------------------ Generate Authority Score Feature - Begin ------------------------------------------------
function GenerateAuthorityScore(authorityScoreTemp, entityList, siteConstraint, url, hostId, domainId, officialSiteCondition, documentPosition) {
    var domain = GetDomainNameFromUrl(url);

    if (documentPosition < c_officialSiteDPThres && (IsOfficialSite1(entityList, domain) || IsOfficialSite2(hostId, domainId, officialSiteCondition))) {
        return c_officialSiteScore;
    }
    else if (IsSiteConstraintMatch(siteConstraint, domain)) {
        return authorityScoreTemp + c_officialSiteScore + 1;
    }
    else {
        return authorityScoreTemp;
    }
}

function IsOfficialSite1(entityList, domain) {
    if (IsNull(entityList) || entityList.length != 1) {
        return false;
    }
    var entity = entityList[0].text;
    return IsSpanMatchDomain(entity, domain);
}

function IsOfficialSite2(hostId, domainId, officialSiteCondition) {
    var isOfficialSite = false;
    for (var i = 0, len = officialSiteCondition.length; i < len; i++) {
        var curOfficialSiteCondition = officialSiteCondition[i];
        if (curOfficialSiteCondition.hostId !== "") {
            if (curOfficialSiteCondition.hostId == hostId) {
                isOfficialSite = true;
            }
        }
        else {
            if (curOfficialSiteCondition.domainId == domainId) {
                isOfficialSite = true;
            }
        }
        if (isOfficialSite) {
            break;
        }
    }
    return isOfficialSite;
}

function GetDomainNameFromUrl(url) {
    var domain;
    if (url.indexOf("://") > -1) {
        domain = url.split('/')[2];
    }
    else {
        domain = url.split('/')[0];
    }
    return domain.split(':')[0];
}

function IsSiteConstraintMatch(siteConstraint, domain) {
    var isMatch = false;
    for (var i = 0, len = siteConstraint.length; i < len; i++) {
        if (IsSpanMatchDomain(siteConstraint[i], domain)) {
            isMatch = true;
            break;
        }
    }
    return isMatch;
}

function IsSpanMatchDomain(span, domain) {
    domain = " " + domain.replace(/\./g, ' ') + " ";
    if (domain.indexOf(" " + span + " ") != -1) {
        return true;
    }
    if (domain.indexOf(" " + span.replace(/\s/g, '') + " ") != -1) {
        return true;
    }
    return false;
}
//------------------------------------------------ Generate Authority Score Feature - End ------------------------------------------------


//------------------------------------------------ Generate Guarding Score Feature - Begin ------------------------------------------------
function GenerateGuardingScore(GuardingUrlScore, guardingkeyword, matchData, intentMatchAnyTop5) {
	//****@Frank how to compute the guardingScore based on the flowing conditions*******************
	/*
				• Will keep the document’s original position if it meet all the following conditions at the same time:
				○ At least one document in Top5 IntentMatching > 0; // intentMatchInTop5
				○ EntityMatching > threshold;
				○ IntentMatching == 0;
				○ GuardingScore == 1000 or SiteConstraintMatchDomain == 1000;
				○ LowQualitySiteScore == 0 and No opposed constraint match.
	*/
    if (GuardingUrlScore == 100 || IsArrayPhraseMatchForTitleSnippet(guardingkeyword, matchData.title)) {
        return c_guardingScore;
    }
    return 0;
}
//------------------------------------------------ Generate Guarding Score Feature - End ------------------------------------------------

//------------------------------------------------ Generate Threshold Score Feature - Begin @Frank---------------------------------------------
function GenerateNumNoZero(threshold_top, weightScore_thresholdBingClick, weightScore_fastBrain){
	var num_nozero = 0;
	var sum_threshold = 0;
	if (threshold_top != 0){
		num_nozero += 1;
		sum_threshold += threshold_top;
	}
	if(weightScore_thresholdBingClick != 0){
		num_nozero += 1;
		sum_threshold += weightScore_thresholdBingClick;
	}
	if(weightScore_fastBrain != 0){
		num_nozero += 1;
		sum_threshold += weightScore_fastBrain;
	}
	if (num_nozero > 0){
		return sum_threshold / num_nozero;
	}
	else {
		return 0;
	}
}

function GenerateConstrainThresholdScore(matchDataArray, documentsLocal, top20doc, keyFeaturesOfDocuments) {
    var curDoc, featureVector, matchData, url;
	
	var weightScore_thresholdBingClick_constraint = 0; //Threshold_BingClick
	var sum_thresholdBingClick = 0;
	var weightScore_fastBrain_entity = 0; //threshold fast brain
	var weightScore_fastBrain_intent = 0;
	var sum_onlineMemoryUrlFeature = 0; 
	var drConstraintScoreArray = new Array(20);

	for (i = 0; i < top20doc; ++i) {
		curDoc = documentsLocal[i];
		featureVector = curDoc.rerankfeatures;
		matchData = matchDataArray[i];
		url = matchData.url;
		var numberOfPerfectMatch_BingClick_i = curDoc.NumberOfPerfectMatch_BingClick;// Check how to get the feature from L2;
		var onlineMemoryUrlFeature_i = curDoc.OnlineMemoryUrlFeature_0; // check weather the method to get L2 feature ONline is right?
		
		//Generate cons match score
		var constraintMatchScore = keyFeaturesOfDocuments[i].constraintMatchScore;
		//Generate Threshold_BingClick
		weightScore_thresholdBingClick_constraint += constraintMatchScore * numberOfPerfectMatch_BingClick_i;
		sum_thresholdBingClick += numberOfPerfectMatch_BingClick_i;
		
		//Generate Threshold_FastBrain
		weightScore_fastBrain_constraint += constraintMatchScore * onlineMemoryUrlFeature_i;
		sum_onlineMemoryUrlFeature += onlineMemoryUrlFeature_i;
		
		drConstraintScoreArray[i] = constraintMatchScore;
	}
	// Generate constrain threshold of FastBrain/BingClick 
	weightScore_thresholdBingClick_constraint = weightScore_thresholdBingClick_constraint / sum_thresholdBingClick;
	weightScore_fastBrain_constraint = weightScore_fastBrain_constraint / sum_onlineMemoryUrlFeature;
	
	//Generate constrain top threshold
	var threshold_top_constraint = 0;
	for (i = 0; i < 3; i++){
		var weight_pos = 1;
		if (i == 0) {
			weight_pos = 3;
		}
		threshold_top_constraint += weight_pos * drConstraintScoreArray[i];
	}
	threshold_top_constraint = threshold_top_constraint / 5.0;

	//Generate final threshold entity/intent/constraint
	var threshold_final_constraint = GenerateNumNoZero(threshold_top_constraint, weightScore_thresholdBingClick_constraint, weightScore_fastBrain_constraint);

	return threshold_final_constraint;
}


function GenerateThresholdScore(subIntentId, subIntentScore, MSSFDecodeResult, matchDataArray, intentMatchCondition, constraintMatchCondition, documentsLocal, top20doc, keyFeaturesOfDocuments) {
    var i, curDoc, featureVector, matchData, url;
	var entityMatchScoreArray = new Array(0, 0);//score of top3 doc
	var entityMatchScoreThreshold = 0;
	var entityMatchingScorePosTop1 = 0;
	var isTrigger = true;
	var drEntityScoreArray = new Array(20);
	var drIntentScoreArray = new Array(20);
	
	var weightScore_thresholdBingClick_entity = 0; //Threshold_BingClick
	var weightScore_thresholdBingClick_intent = 0;
	var sum_thresholdBingClick = 0;
	var weightScore_fastBrain_entity = 0; //threshold fast brain
	var weightScore_fastBrain_intent = 0;
	var sum_onlineMemoryUrlFeature = 0; 

	for (i = 0; i < top20doc; ++i) {
		curDoc = documentsLocal[i];
		featureVector = curDoc.rerankfeatures;
		matchData = matchDataArray[i];
		url = matchData.url;
		var numberOfPerfectMatch_BingClick_i = curDoc.NumberOfPerfectMatch_BingClick;// Check how to get the feature from L2;
		var onlineMemoryUrlFeature_i = curDoc.OnlineMemoryUrlFeature_0; // check weather the method to get L2 feature ONline is right?
		
		//Generate entity/intent/cons match score
		var entityMatchScore = keyFeaturesOfDocuments[i].entityMatchScore;
		var intentMatchScore = keyFeaturesOfDocuments[i].intentMatchScore;
		//Generate Threshold_BingClick
		weightScore_thresholdBingClick_entity += entityMatchScore * numberOfPerfectMatch_BingClick_i;
		weightScore_thresholdBingClick_intent += intentMatchScore * numberOfPerfectMatch_BingClick_i;
		sum_thresholdBingClick += numberOfPerfectMatch_BingClick_i;
		
		//Generate Threshold_FastBrain
		weightScore_fastBrain_entity += entityMatchScore * onlineMemoryUrlFeature_i;
		weightScore_fastBrain_intent += intentMatchScore * onlineMemoryUrlFeature_i;
		sum_onlineMemoryUrlFeature += onlineMemoryUrlFeature_i;
		
		drEntityScoreArray[i] = entityMatchScore;
		drIntentScoreArray[i] = intentMatchScore;
	}
	// Generate entity/intent/constrain threshold of FastBrain/BingClick 
	weightScore_thresholdBingClick_entity = weightScore_thresholdBingClick_entity / sum_thresholdBingClick;
	weightScore_fastBrain_entity = weightScore_fastBrain_entity / sum_onlineMemoryUrlFeature;
	weightScore_thresholdBingClick_intent = weightScore_thresholdBingClick_intent / sum_thresholdBingClick;
	weightScore_fastBrain_intent = weightScore_fastBrain_intent / sum_onlineMemoryUrlFeature;
	
	//Generate entity/intent/constrain top threshold
	var threshold_top_entity = 0;
	var threshold_top_intent = 0;
	for (i = 0; i < 3; i++){
		var weight_pos = 1;
		if (i === 0) {
			weight_pos = 3;
		}
		threshold_top_entity += weight_pos * drEntityScoreArray[i];
		threshold_top_intent += weight_pos * drIntentScoreArray[i];
	}
	threshold_top_entity = threshold_top_entity / 5.0;
	threshold_top_intent = threshold_top_intent / 5.0;

	//Generate final threshold of entity/intent/constraint
	var threshold_final_entity = GenerateNumNoZero(threshold_top_entity, weightScore_thresholdBingClick_entity, weightScore_fastBrain_entity);
	var threshold_final_intent = GenerateNumNoZero(threshold_top_intent, weightScore_thresholdBingClick_intent, weightScore_fastBrain_intent);
	
	var threshold_final = new Array[2];
	threshold_final[0] = threshold_final_entity;
	threshold_final[1] = threshold_final_intent;
	return threshold_final;
}

//------------------------------------------------ Generate Threshold Score Feature - End @Frank-----------------------------------------------

//------------------------------------------------ Generate DRScoreRank Feature -BEGIN --------------------------------------------------@Frank
function GenerateDRScoreRank(curDRScore, l3Threshold, l2Threshold, l1Threshold) {
	if(curDRScore >= l1Threshold) {
		return 4;
	}
	else if(curDRScore >= l2Threshold){
		return 3;
	}
	else if(curDRScore >= l3Threshold) {
		return 2;
	}
	else if(curDRScore > 0){
		return 1;
	}
	return 0;
}

function RankerCondition1(top20doc,keyFeaturesOfDocuments, entityMatchThreshold, intentMatchThreshold, top1EntityMatch,drScoreTop1EntityMatch, top1IntentMatch, drScoreTop1IntentMatch, constraintMatchCondition, MSSFDecodeResult, matchDataArray, rerankFeatures ){
	if(!((entityMatchThreshold > 250) && (top1EntityMatch >= entityMatchThreshold) && (drScoreTop1EntityMatch >= entityMatchThreshold) && (top1IntentMatch >= intentMatchThreshold) && (drScoreTop1IntentMatch >= intentMatchThreshold))) {
		return false;
	}
	var top5EntityIntentASCount = 0;
	var top8EntityIntentASCount = 0;
	var top5IntentMatchSum = 0;
	
	for (i = 0; i < Math.min(top20doc, 8); ++i) {
		var curEntityScore = keyFeaturesOfDocuments[i].entityMatchScore;
		var curIntentScore = keyFeaturesOfDocuments[i].intentMatchScore;
		var curAuthorityScore = keyFeaturesOfDocuments[i].authorityScore;
		if ((i < 5) && (curEntityScore >= entityMatchThreshold) && (curIntentScore >= intentMatchThreshold) && (curauthorityScore > 0)) {
			top5EntityIntentASCount++;
			top8EntityIntentASCount++;
			top5IntentMatchSum += curIntentScore;
		}
		if ((i >= 5 && i < 8) && (curEntityScore >= entityMatchThreshold) && (curIntentScore >= intentMatchThreshold) && (curauthorityScore > 0)) {
			top8EntityIntentASCount++;
		}
	}
	if(!(top5EntityIntentASCount >= 2 || top8EntityIntentASCount >= 4)) {
		return false;
	}
	if(top5IntentMatchSum != 0) {
		return true;
	}
	var top5ConstraintMatchSum = 0;
	for (i = 0; i < Math.min(top20doc, 5); ++i) {
		var matchData = matchDataArray[i];
		var url = matchData.url;
		var authorityScore = keyFeaturesOfDocuments[i].authorityScore;
        var constraintMatchUrlScore = PEConstraintScoreDecode(rerankFeatures[c_FeatureId_PEScoreConstraint], MSSFDecodeResult.urlKeyword, url, rerankFeatures[c_FeatureId_UrlDepth]);
        var constraintMatchScore = GenerateConstraintMatchingScore(constraintMatchCondition, MSSFDecodeResult.constraint, matchData, authorityScore, constraintMatchUrlScore, i);
		keyFeaturesOfDocuments[i].constraintMatchScore = constraintMatchScore;
		top5ConstraintMatchSum += constraintMatchScore;
	}
	if(top5ConstraintMatchSum != 0){
		for(i = 5; i < Math.max(top20doc, 5); ++i) {
			var matchData = matchDataArray[i];
			var url = matchData.url;
			var authorityScore = keyFeaturesOfDocuments[i].authorityScore;
			var constraintMatchUrlScore = PEConstraintScoreDecode(rerankFeatures[c_FeatureId_PEScoreConstraint], MSSFDecodeResult.urlKeyword, url, rerankFeatures[c_FeatureId_UrlDepth]);
			var constraintMatchScore = GenerateConstraintMatchingScore(constraintMatchCondition, MSSFDecodeResult.constraint, matchData, authorityScore, constraintMatchUrlScore, i);
			keyFeaturesOfDocuments[i].constraintMatchScore = constraintMatchScore;
		}
		return true;
	}
	return false;
}

function SCORE(entityMatchScore, entityMatchThreshold, intentMatchScore, intentMatchThreshold, constraintMatchScore, constraintMatchThreshold, authorityScore){
	var score = 100 + authorityScore;
	if(constraintMatchScore >= constraintMatchThreshold){
		score = score + 1600;
	}
	else {
		score = score + 2* constraintMatchScore;
	}
	if(intentMatchScore >= intentMatchThreshold){
		score = score + 8000;
	}
	else {
		score = score + 2 * intentMatchThreshold;
	}
	if(entityMatchScore >= entityMatchThreshold){
		score = score + 10000000;
	}
	else{
		score = score + 10000 * entityMatchScore;
	}
	return score;
}
function RankerCondition2(drScoreThreshold, documentPosition, curKeyFeatures, curRerankFeatures, top20doc, hostId, documentsLocal,keyFeaturesOfDocuments, entityMatchThreshold, intentMatchThreshold, constraintMatchThreshold)){
	var drScroe = documents[i].l2score;
	if(!((drScore > drScoreThreshold) && (documentPosition < 16))){
		return false;
	}
	if(curKeyFeatures.isSiteConsMatchDomain === 1000) || curRerankFeatures[c_FeatureId_PEScoreDiversity] > 0){
		return true;
	}
	if (curKeyFeatures.lowQualitySiteScore !== 0){
		return false;
	}
	
	var rankVec = [];
	for (i = 0; i < top20doc; ++i) {
		var curHostId = documentsLocal[i].hostId;
		if(hostId === curHostId){
			rankVec.push({index:i, signal: 0});
			var curEntityScore = keyFeaturesOfDocuments[i].entityMatchScore;
			var curIntentScore = keyFeaturesOfDocuments[i].intentMatchScore;
			var curConstraintScore = keyFeaturesOfDocuments[i].constraintMatchScore;
			var curAuthorityScore = keyFeaturesOfDocuments[i].authorityScore;
			if((curEntityScore > 0) && curIntentScore >= 0 && curConstraintScore != 1)){
				rankVec.signal = SCORE(curEntityScore, entityMatchThreshold, curIntentScore, intentMatchThreshold, curConstraintScore, constraintMatchThreshold, curAuthorityScore);
			}
			else {
				rankVec.signal = 100;
			}
		}
	}
	rankVec.sort(SortDescending);
	if rankPos = 0;
	for(i = 0; i < rankVec.length; i++){
		if (rankVec[i].index === documentPosition){
			rankPos = i;
			break;
		}
	}
	if(rankPos === 0) { //************* Frank check it **************
		return true;
	}
	return false;
}
			

function MainRankerByFrank(subIntentId, subIntentScore, MSSFDecodeResult, matchDataArray, intentMatchCondition, constraintMatchCondition, documentsLocal, documentCount) {
	//---------------   step1 DRScoreRank Begin ----------------------------
	var docCount = documentCount;
	var top20doc = Math.min(docCount, 20);
	var maxDRScoreTop20 = 0;
	var minDRScoreTop20 = Number.MAX_SAFE_INTEGER;
	var	l3Threshold = 0;
	var l2Threshold = 0; 
	var l1Threshold = 0; 
	var rankScoreVector = [];
	var maxDRScore = 0;
	for (i = 0; i < top20doc; ++i) {
		curDoc = documentsLocal[i];
		var curDRScore = curDoc.l2score;
		rankScoreVector.push({ oriIndex: i, drScoreRank: 0.0, drScore : curDRScore, newL3Score2: 1000 - i});
		if (curDRScore > maxDRScoreTop20) {
			maxDRScoreTop20 = curDRScore;
		}
		if (curDRScore < minDRScoreTop20) {
			minDRScoreTop20 = curDRScore;
		}
		if (i < Math.min(10, top20doc) && curDRScore > maxDRScore) {
			maxDRScore = curDRScore;
		}
	}
	var tmpThreshold = (maxDRScoreTop20 - minDRScoreTop20)/4;
	l3Threshold = tmpThreshold + minDRScoreTop20;
	l2Threshold = tmpThreshold * 2 + minDRScoreTop20;
	l1Threshold = tmpThreshold * 3 + minDRScoreTop20;
	for (i = 0; i < top20doc; i++){
		rankScoreVector[i].drScoreRank = GenerateDRScoreRank(curDRScore, l3Threshold, l2Threshold, l1Threshold);
	}
	//---------------   step1 DRScoreRank End ----------------------------
	
	//------------------------------ Step2 NewL3Score ranker Begin ------------------------------------
	//-----1. Initial Begin -----
	var drScoreThreshold = 0;
	var maxDRScorePosTemp = 100;
	rankScoreVector.sort(SortNumberDRScoreDesc);
	var thresholdPos = Math.min(15, top20doc);
	var oriPos = rankScoreVector[thresholdPos].oriIndex;
	var maxDRScorePos = 0;
	var top1EntityMatch = 0;
	var top1IntentMatch = 0;
	var drScoreTop1EntityMatch = 0;
	var drScoreTop1IntentMatch = 0;
	var matchData, featureVector, url;
	var keyFeaturesOfDocuments = [];
	var sumIntentMatchTop5 = 0;
	for (i = 0; i < top20doc; ++i) {
		curDoc = documentsLocal[i];
		if (i == 0){
			
			matchData = matchDataArray[i];
			featureVector = curDoc.rerankfeatures;
			url = matchData.url;
			var entityMatchScore = GenerateEntityMatchingScore(MSSFDecodeResult.entity, matchData);//feature:entity
			var topSiteScoreResult = PETopSiteScoreDecode(featureVector[c_FeatureId_PEScoreTopSite], MSSFDecodeResult.urlKeyword, url, featureVector[c_FeatureId_UrlDepth]);
			var authorityScore = GenerateAuthorityScore(topSiteScoreResult.authorityScore, MSSFDecodeResult.entity, MSSFDecodeResult.siteConstraint, url, curDoc.hostid, curDoc.domainid, MSSFDecodeResult.officialSite, i);
			var specificSiteScore = topSiteScoreResult.isSpecific;
			var intentMatchScore = GenerateIntentMatchingScore(intentMatchCondition, MSSFDecodeResult.intent, matchData, topSiteScoreResult.isIntent);//@Frank generate intent feature score
			keyFeaturesOfDocuments.push(new KeyFeatures(entityMatchScore, intentMatchScore, authorityScore, specificSiteScore, 0, 0, topSiteScoreResult, 0));//@Frank add intentMatchScore && constraintMatchScore
			top1EntityMatch = entityMatchScore;
			top1IntentMatch = intentMatchScore;
			sumIntentMatchTop5 += intentMatchScore;
		}
		var curDRScore = curDoc.l2score;
		if (i === oriPos){
			drScoreThreshold = curDRScore;
		}
		if(i < Math.min(10, top20doc) && curDRScore === maxDRScore) {
			if (maxDRScorePosTemp > i) {
				maxDRScorePosTemp = i;
			}
		}
		if (i > 0)
		{
			var entityMatchScore = GenerateEntityMatchingScore(MSSFDecodeResult.entity, matchData);//feature:entity
			var topSiteScoreResult = PETopSiteScoreDecode(featureVector[c_FeatureId_PEScoreTopSite], MSSFDecodeResult.urlKeyword, url, featureVector[c_FeatureId_UrlDepth]);
			var authorityScore = GenerateAuthorityScore(topSiteScoreResult.authorityScore, MSSFDecodeResult.entity, MSSFDecodeResult.siteConstraint, url, curDoc.hostid, curDoc.domainid, MSSFDecodeResult.officialSite, i);
			var specificSiteScore = topSiteScoreResult.isSpecific;
			var intentMatchScore = GenerateIntentMatchingScore(intentMatchCondition, MSSFDecodeResult.intent, matchData, topSiteScoreResult.isIntent);//@Frank generate intent feature score
			keyFeaturesOfDocuments.push(new KeyFeatures(entityMatchScore, intentMatchScore, authorityScore, specificSiteScore, 0, 0, topSiteScoreResult, 0));//@Frank add intentMatchScore && constraintMatchScore
			sumIntentMatchTop5 += intentMatchScore;
		}
	}
	if (maxDRScorePosTemp === 100){
		maxDRScorePos = 0;
	}
	else {
		maxDRScorePos = maxDRScorePosTemp;
	}
	matchData = matchDataArray[maxDRScorePos];
	drScoreTop1IntentMatch = keyFeaturesOfDocuments[maxDRScorePos].intentMatchScore;
	drScoreTop1EntityMatch = keyFeaturesOfDocuments[maxDRScorePos].entityMatchScore;
	
	var thresholdArr = new Array(2); //--Check weather array[2] as return. 
	thresholdArr = GenerateThresholdScore(subIntentId, subIntentScore, MSSFDecodeResult, matchDataArray, intentMatchCondition, constraintMatchCondition, documentsLocal, documentCount, keyFeaturesOfDocuments); // @Frank need to turn later in-order to run faster
	entityMatchThreshold = thresholdArr[0];//--Generate through function: GenerateThresholdScore by Frank-----
	intentMatchThreshold = thresholdArr[1];//--Generate through function: GenerateThresholdScore by Frank-----
	//-----1. Initial End -----
	
	//-----2. NewL3Score Generate Begin ------
	var rankVector = [];
	var rankVectorInOriPlace = [];
    var guardVector = [];
	for (i = 0; i < top20doc; i++) {
		var documentPosition = i;
		if (!IsGuard(keyFeaturesOfDocuments[i], documentsLocal[i].rerankfeatures, i, entityMatchThreshold, maxDRScorePos, isSiteConsMatchDomain, intentMatchAnyTop5)) { 
            rankVector.push({ index: i, signal: 0.0 });
            rankVectorInOriPlace.push({ index: i });
        }
        else {
            documents[i].score = 1000.0 - i;
            guardVector.push({ index: i, signal: 0.0 });
        }
	}
	

	var rankDocLength = rankVector.length; //*************************rankVector store the document that need to be rerank **********************
    for (i = 0; i < rankDocLength; ++i) {
        var curRerankFeatures = documentsLocal[rankVector[i].index].rerankfeatures;
        var curKeyFeatures = keyFeaturesOfDocuments[rankVector[i].index];
		var documentPosition = rankVector[i].index;
        var currentHostId = documentsLocal[rankVector[i].index].hostid;
		if(RankerCondition1(top20doc,keyFeaturesOfDocuments, entityMatchThreshold, intentMatchThreshold, top1EntityMatch,drScoreTop1EntityMatch, top1IntentMatch, drScoreTop1IntentMatch, constraintMatchCondition, MSSFDecodeResult, matchDataArray, rerankFeatures )){
			//-------------------Generate top20 constraint match score Begin ------------------
			/*for(i = 0; i < top20doc; i++){
				matchData = matchDataArray[i];
				curDoc = documentsLocal[i];
				featureVector = curDoc.rerankfeatures;
				url = matchData.url;
				authorityScore = keyFeaturesOfDocuments[i].authorityScore;
				var constraintMatchUrlScore = PEConstraintScoreDecode(featureVector[c_FeatureId_PEScoreConstraint], MSSFDecodeResult.urlKeyword, url, featureVector[c_FeatureId_UrlDepth]);
				var curConstraintMatchScore = GenerateConstraintMatchingScore(constraintMatchCondition, MSSFDecodeResult.constraint, matchData, authorityScore, constraintMatchUrlScore, i);
				keyFeaturesOfDocuments[i].constraintMatchScore = curConstraintMatchScore;
			}*/
			//Above is generated in RankerCondition1 run current place.
			var constraintMatchThreshold = GenerateConstrainThresholdScore(matchDataArray, documentsLocal, top20doc, keyFeaturesOfDocuments);
			//-------------------Generate top20 constraint match score End ------------------
			
			if(RankerCondition2(drScoreThreshold, documentPosition, curKeyFeatures, curRerankFeatures, top20doc, hostId, documentsLocal, keyFeaturesOfDocuments, entityMatchThreshold, intentMatchThreshold, constraintMatchThreshold){
				var curEntityMatchScore = curKeyFeatures.entityMatchScore;
				var curIntentMatchScore = curKeyFeatures.intentMatchScore;
				var curConstraintMatchScore = curKeyFeatures.constrintMatchScore;
				var curAuthorityScore = curKeyFeatures.authorityScore;
				if(curEntityMatchScore > 0 && curIntentMatchScore >= 0 && curConstraintMatchScore != 1) {
					rankVector[i].signal = SCORE(curEntityMatchScore, entityMatchThreshold, curIntentMatchScore, intentMatchThreshold, curConstraintMatchScore, constraintMatchThreshold, curAuthorityScore);
				}
				else {
					rankVector[i].signal = 100;
				}
			}
			else {
				rankVector[i].signal = 100;
			}
		}
		else {
			rankVector[i].signal = 1000.0 - i;
		}
    }
	//-----2. NewL3Score Generate End ------
	
	var oriRankVector = [];
	for(i = 0; i < rankVector.length; ++i){
		oriRankVector.push({index: rankVector[i].index, signal:rankVector[i].signal});
	}
	rankVector.sort(SortDescending);
	
	//---- rankScoreVector store score feature newL3Score2 ----
	for(i = 0; i < rankDocLength; ++i){
		rankScoreVector[rankVector[i].index].newL3Score2 = 1000.0 - rankVectorInOriPlace[i].index;
		//documents[rankVector[i].index].score = 1000.0 - rankVectorInOriPlace[i].index;
	}
	//------------------------------ Step2 NewL3Score ranker End ------------------------------------
	
	
	//----------------------------- Step3 Adjust L3 ranker Begin  ------------------------------------
	rankScoreVector.sort(SortDescendingByNewL3Score);
	var posby0 = 0;
	for(i = 0; i < rankScoreVector.length; ++i){
		if(rankScoreVector[i].oriIndex === 0){
			posby0 = i;
			break;
		}
	}

	if(posby0 >= 8 || adjustCondition1(rankScoreVector, documentsLocal)){
		for(j = 0; j < oriRankVector.length; ++j){
			oriRankVector[j].signal = 1000.0 - j;
		}
	}
	//----------------------------- Step3 Adjust L3 ranker End ------------------------------------
	
	//----------------------------- Step4 Sorted document based on AuthorityScore and NewL3Score2 Begin ------------------------------
	//a. document rank position based on authorityScore 
	var rankByAuthoScore = [];
	var rankByNewL3Score = [];
	for (i = 0; i < top20doc; ++i){
		var curAuthoScore = keyFeaturesOfDocuments[i].authorityScore;
		rankByAuthoScore.push({index:i, signal:curAuthoScore});
	}
	rankByAuthoScore.sort(SortDescending);
	
	//b. document rank position based on NewL3Score2
	for(i = 0; i < top20doc; ++i){
		rankByNewL3Score.push({index : i, signal : 1000.0 - i});
	}
	oriRankVector.sort(SortDescending);
	for(i = 0; i < oriRankVector.length; ++i){
		rankByNewL3Score[oriRankVector[i].index].signal = 1000.0 - rankVectorInOriPlace[i].index;
	}
	rankByNewL3Score.sort(SortDescending);
	//----------------------------- Step4 Sorted document based on AuthorityScore and NewL3Score2 End ------------------------------
	
	//---------------------------- Step5 sorted final feature change Begin -------------------
	var equalCount = 0;
	for (i = 0; i < Math.min(5, rankByNewL3Score.length); ++i){
		if(rankByNewL3Score[i].index === rankByAuthoScore[i].index){
			equalCount++;
		}
	}
	if(equalCount != 5){
		for (i = 0; i < oriRankVector.length; ++i){
			documents[oriRankVector[i].index].score = 1000.0 - rankVectorInOriPlace[i].index;
		}
	}
	//---------------------------- Step5 sorted final feature change End -------------------
}

function adjustCondition1(rankScoreVector, documentsLocal){
	var oriPos0 = rankScoreVector[0].oriIndex;
	var oriPos1 = rankScoreVector[1].oriIndex;
	var oriPos2 = rankScoreVector[2].oriIndex;
	var newSum = documentsLocal[oriPos0].OnlineMemoryUrlFeature_0 + documentsLocal[oriPos1].OnlineMemoryUrlFeature_0 + documentsLocal[oriPos2].OnlineMemoryUrlFeature_0;
	var oriSum = documentsLocal[0].OnlineMemoryUrlFeature_0 + documentsLocal[1].OnlineMemoryUrlFeature_0 + documentsLocal[2].OnlineMemoryUrlFeature_0;
	
	if(newSum > oriSum){
		return true;
	}
	else
		return false;
}
//------------------------------------------------ Main Ranker - Begin ------------------------------------------------
//---------------- Guarding Condition Begin ------------------------
function IsGuard(keyFeatures, rerankFeatures, documentPosition, entityMatchScoreThreshold, maxDRscorePos, iSiteConsMatchDomain, sumIntentMatchTop5) {
    // if (rerankFeatures[c_FeatureId_RankomaticScore] >= 5) {
        // return true;
    // }
	// if (documentPosition == 0 && markers[c_MarkerId_NumberOfPerfectMatches_BingClick] > 0) {
		// return true;
	// }
	var con1 = false;
	if(documentPosition != maxDRScorePos) { 
		con1 = true;
	}
	else {
		return false;
	}
	
	var con2 = false;
	if(documentPosition < 5 && keyFeatures.entityMatchScore >= entityMatchScoreThreshold && keyFeatures.intentMatchScore === 0 && keyFeatures.constraintMatchScore !== c_constraintMatchScoreOpposed && keyFeatures.lowQualitySiteScore === 0 && (keyFeatures.guardingScore === 1000 || IsSiteConsMatchDomain === 1000)){
		con2 = true;
	}
	var con3 = false;
	if(keyFeatures.guardingScore !== 1000 && !(sumIntentMatchTop5 > 0 && con2)){
		con3 = true;
	}
	else {
		return false;
	}
	
	return con3;
}
//---------------- Guarding Condition End ------------------------



function IsTriggerForKnownQuery(entityMatchCountInTop20) {
    return entityMatchCountInTop20 >= 5;
}

function IsTriggerForUnKnownQuery(keyFeaturesOfDocuments, specificSiteCountInTop5, entityMatchScoreThreshold) {
    if (specificSiteCountInTop5 == 0) {
		return false;
	}
	var goodSiteCountInTop10 = 0;
    var length = Math.min(documentCount, 10);
    for (var i = 0; i < length; i++) {
        if (keyFeaturesOfDocuments[i].entityMatchScore >= entityMatchScoreThreshold && keyFeaturesOfDocuments[i].intentMatchScore >= c_intentMatchScore_3rd && keyFeaturesOfDocuments[i].authorityScore > 0) {
            goodSiteCountInTop10++;
        }
    }
    return goodSiteCountInTop10 >= 3;
}

function SCORING(MSSFDecodeResult, keyFeatures, rerankFeatures, matchData, entityMatchScoreThreshold, constraintMatchCondition, documentPosition, authorityScoreOldOriginal, constarintMatchThreshold, intentMatchScoreThreshold) { //*************@Frank main Ranking logistic****************
    var score = 100.0;
	var entityMatchScore = keyFeatures.entityMatchScore;
    var intentMatchScore = keyFeatures.intentMatchScore;
	var constraintMatchScore = GenerateConstraintMatchingScore(constraintMatchCondition, MSSFDecodeResult.constraint, matchData, authorityScore, constraintMatchUrlScore, documentPosition);
    var authorityScore = keyFeatures.authorityScore;
	score += authorityScoreOldOriginal;
	if (entityMatchScore > 0 && intentMatchScore >= 0) {
		if (constraintMatchScore >= constarintMatchThreshold){
			score += 1600;
		}
		else {
			score += 2 * constraintMatchScore;
		}
		if(intentMatchScore >= intentMatchScoreThreshold){
			score += 8000;
		}
		else {
			score += 2*intentMatchScore;
		}
		if (entityMatchScore >= entityMatchScoreThreshold) {
                score += 10000000;
        }
		else {
			score += 10000 * entityMatchScore;
		}
		return score;
	}
	/*
    var entityMatchScore = keyFeatures.entityMatchScore;
    var intentMatchScore = keyFeatures.intentMatchScore;
    var authorityScore = keyFeatures.authorityScore;
    if (entityMatchScore > 0 && intentMatchScore >= 0) {
		var url = matchData.url;
        var constraintMatchUrlScore = PEConstraintScoreDecode(rerankFeatures[c_FeatureId_PEScoreConstraint], MSSFDecodeResult.urlKeyword, url, rerankFeatures[c_FeatureId_UrlDepth]);
        var constraintMatchScore = GenerateConstraintMatchingScore(constraintMatchCondition, MSSFDecodeResult.constraint, matchData, authorityScore, constraintMatchUrlScore, documentPosition);
        if (constraintMatchScore != c_constraintMatchScoreOpposed) {
            if (entityMatchScore >= entityMatchScoreThreshold) {
                score += c_entityMatchScore_1st;
            }
            else {
                score += entityMatchScore;
            }
            score += intentMatchScore;
            score += authorityScore;
            if (keyFeatures.contentQualityScore > 0) {
                score += 1000;
                if (constraintMatchScore >= c_constraintMatchScore_4th)
				{
					score += constraintMatchScore;
				}
            }
            return score;
        }
    }
	*/
    return 100.0;
}

function SortDescending(a, b) {
    return b.signal - a.signal;
}

function SortDescendingByNewL3Score(a, b){
	return b.newL3Score2 - a.newL3Score2;
}

function NormalizeRankScore(score, index) { //***@Frank why define this NormalizeRankScore function ***********
    return score * 100 + (100 - index);
}

function KeyFeatures(entityMatchScore, intentMatchScore, authorityScore, specificSiteScore, guardingScore, lowQualitySiteScore, topSiteScoreResult, drScoreRank, constraintMatchScore) {
    this.entityMatchScore = entityMatchScore;
    this.intentMatchScore = intentMatchScore;
    this.authorityScore = authorityScore;
    this.specificSiteScore = specificSiteScore;
    this.guardingScore = guardingScore;
    this.lowQualitySiteScore = lowQualitySiteScore;
    this.contentQualityScore = 1000;
	this.topSiteScoreResult = topSiteScoreResult;
	this.drScoreRank = drScoreRank;
	this.constraintMatchScore = constraintMatchScore;
}

function MatchData(title, url, snippet, wordFoundTitleArray, wordFoundBodyArray) {
    this.title = title;
    this.url = url;
    this.snippet = snippet;
    this.wordFoundTitleArray = wordFoundTitleArray;
    this.wordFoundBodyArray = wordFoundBodyArray;
}
//------------------------------------------------ Main Ranker - End ------------------------------------------------


//------------------------------------------------ Utilities - Begin ------------------------------------------------
function IsNull(obj) {
    return obj === null || typeof (obj) == "undefined";
}

function StreamNormalization(stream) {
	var newStream = [];
	var j = 0;
	var len = Math.min(stream.length, c_maxCaptionCharLength);
	for (var i = 0; i < len; i++) {
		var ch = stream.charCodeAt(i);
		if ((ch >= 97 && ch <= 122) || (ch >= 48 && ch <= 57)) {
			newStream[j++] = ch;
		}
		else if (ch >= 65 && ch <= 90) {
			newStream[j++] = ch + 32;
		}
		else {
			if(j>0 && newStream[j-1] != 32)
			{
				newStream[j++] = 32;
			}
		}
	}
	return String.fromCharCode.apply(this, newStream);
}

function IsPhraseMatchForTitleSnippet(phrase, stream) {
    if (IsNull(phrase) || phrase === "" || IsNull(stream))
        return false;
    return (" " + stream + " ").indexOf(" " + phrase + " ") != -1;
}

function IsPhraseMatchForUrl(phrase, stream) {
    if (IsNull(phrase) || phrase === "" || IsNull(stream))
        return false;
    return stream.indexOf(phrase) != -1;
}

function IsArrayPhraseMatchForTitleSnippet(array, stream) {
    if (IsNull(array) || IsNull(stream))
        return false;

    var length = array.length;
    for (var i = 0; i < length; i++) {
        if (IsPhraseMatchForTitleSnippet(array[i], stream))
            return true;
    }
    return false;
}

function IsArrayPhraseMatchForUrl(array, urlStream) {
    if (IsNull(array) || IsNull(urlStream))
        return false;

    var length = array.length;
    for (var i = 0; i < length; i++) {
        if (IsPhraseMatchForUrl(array[i], urlStream))
            return true;
    }
    return false;
}

function WordsFoundForTitleSnippet(phrase, wordFoundArray, stream) {
	if (IsNull(phrase) || phrase === "" || IsNull(stream))
        return 0;
	
    var termMatchedRatio = 0;
    var phraseWords = phrase.split(" ");
    var matchedCount = 0;
    var phraseWordsLength = phraseWords.length;
    var wordFoundArrayLength = wordFoundArray.length;
    for (var i = 0; i < phraseWordsLength; i++) {
        var term = phraseWords[i];
        var termIndex = queryTermDict[term];
        if (termIndex < wordFoundArrayLength) {
            // Use word found array
            if (wordFoundArray[termIndex] > 0) {
                matchedCount++;
            }
        }
        else {
            if (IsPhraseMatchForTitleSnippet(term, stream)) {
                matchedCount++;
            }
        }
    }
    termMatchedRatio = matchedCount * 1.0 / phraseWords.length;
    return termMatchedRatio;
}

function ParseWordCandidatePresence(score) {
    var matchArray = new Array(8);
    for (var i = 0; i < 8; i++) {
        if ((score & 15) > 0) {
            matchArray[i] = 1;
        }
        else {
            matchArray[i] = 0;
        }
        score = score >>> 4;
    }
    return matchArray;
}

function GenerateHashCode(str) {
    var hash = 0, i, chr, len;
    if (str.length === 0) return hash;
    for (i = 0, len = str.length; i < len; i++) {
        chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash = hash & 0xfffff;
    }
    return hash;
}

function SortNumberDesc(a, b) {
    return b - a;
}
function SortNumberDRScoreDesc(a, b) {
	return b.drScore - a.drScore;
}
//------------------------------------------------ Utilities - End ------------------------------------------------
