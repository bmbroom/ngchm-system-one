(function(chm){
chm.chmv = '/chmv/';
function _chm_ad(id,tit,fn){var td=fn($('<div></div>').attr('title',tit).attr('id',id));
 $('body').append(td); $('#'+id).dialog({position:[0,200],autoOpen:false});
 chm.menubar.addDialogsMenuItem(id,tit,function(tlmc,mi){td.dialog();});
}
function _chm_as(src){var s=document.createElement('script');
 s.setAttribute('type','text/javascript'); s.setAttribute('src',src);
 $('head').append(s);
}
function _chm_e(sr,ax,fn){function c2(a,b){return a.concat(b);};
 return sr.map(function(r){var v=[];for(var ii=r.start;ii<=r.end;ii++)v.push(ii);
 return v.map(function(i){return fn(ax,i);}).reduce(c2);}).reduce(c2);
}
function viewBoxPlot (dataset, labels) {
    labels = labels.sort().filter(function(el,i,a){return i==a.indexOf(el);});
    labels = labels.map(function(ll){return encodeURIComponent(ll);});
    window.open(chm.chmv + 'boxplot.html?chm=' + chm.mapName + '&dataset=' + dataset + '&labels=' + labels,
		'BoxPlot',
		'location=no,toolbar=no,scrollbars=yes,directories=no,menubar=no,status=no');
};
var viewBoxPlotExpression = viewBoxPlot.bind (undefined, 'Expression');
function viewPointsPlot (dataset,labels) {
    labels = labels.sort().filter(function(el,i,a){return i==a.indexOf(el);});
    labels = labels.map(function(ll){return encodeURIComponent(ll);});
    window.open(chm.chmv + 'pointsplot.html?chm=' + chm.mapName + '&dataset=' + dataset + '&labels=' + labels,
		'PointsPlot',
		'location=no,toolbar=no,scrollbars=yes,directories=no,menubar=no,status=no');
};

var viewPointsPlotExpression = viewPointsPlot.bind (undefined, 'Expression');
function openNCBIGenePage (names) {
    var gname = names[0];
    window.open('http://www.ncbi.nlm.nih.gov/gene?term=(homo%20sapiens%5BOrganism%5D)%20AND%20' + gname + '%5BGene%20Name%5D', 'NCBI');
}

function searchClinicalTrials (names) {
    var gname = names.join('+AND+');
    window.open('http://clinicaltrials.gov/ct2/results?term=' + gname + '&Search=' + 'Search', 'clinicaltrials');
}

function openGeneCardPage (names) {
    var gname = names[0];
    window.open('http://www.genecards.org/cgi-bin/carddisp.pl?gene=' + gname + '&search=' + gname, 'genecards');
}

function searchGoogleScholar (terms) {
    terms = terms.sort().filter(function(el,i,a){return i==a.indexOf(el);});
    var labels = terms.map(function(g){return encodeURIComponent(g);});
    window.open('http://scholar.google.com/scholar?q=' + labels.join('+OR+'), 'scholar');
};

function viewGenesetIdeogramG (genes) {
    genes = genes.sort().filter(function(el,i,a){return i==a.indexOf(el);});
    var labels = genes.map(function(g){return encodeURIComponent(g);});
    window.open('http://bioinformatics.mdanderson.org/ideogramviewer/Ideogram.html?genelist1=' + labels.join(','), 'ideogram');
};

function searchNCBIDatabases (names) {
    var gname = names[0];
    window.open('http://www.ncbi.nlm.nih.gov/gquery/?term=((' + gname + '%5BGene+Symbol%5D)+AND+Homo+sapiens%5BOrganism%5D)', 'ncbi');
}


function searchPubmedAll (terms) {
     terms = terms.sort().filter(function(el,i,a){return i==a.indexOf(el);});
     var labels = terms.map(function(g){return encodeURIComponent(g);});
     window.open('http://www.ncbi.nlm.nih.gov/pubmed/?term=' + labels.join('+AND+'), 'pubmed');
};


function searchPubmedAny (terms) {
    terms = terms.sort().filter(function(el,i,a){return i==a.indexOf(el);});
    var labels = terms.map(function(g){return encodeURIComponent(g);});
    window.open('http://www.ncbi.nlm.nih.gov/pubmed/?term=' + labels.join('+OR+'), 'pubmed');
};

function viewZodiacG (genes) {
    genes = genes.sort().filter(function(el,i,a){return i==a.indexOf(el);});
    var glist = encodeURIComponent(genes.join('\n'));
    window.open('http://compgenome.org/zodiac?Gene_List=' + glist, 'zodiac');
};

function openCBIOGenes (studyid, genes) {
    window.open('http://www.cbioportal.org/public-portal/link.do?cancer_study_id=' + studyid + '&gene_list=' + genes, 'cbio');
}

var fzPJRjOpnxWkj1ZE = openCBIOGenes.bind (undefined, 'gbm_tcga');
function openCBIOPartPage (studyid, ids) {
    var part = ids[0].substr(0,12);
    window.open('http://www.cbioportal.org/public-portal/tumormap.do?cancer_study_id=' + studyid + '&case_id=' + part, 'cbio');
}

var fvpGo36sqyhcShVf = openCBIOPartPage.bind (undefined, 'gbm_tcga');
function getLabelValue (axis, idx) {
    return [axis.labels.getLabel (idx)];
};

function chmSO2 (ns) {
    return ns.map(function(s){return s.split('-').slice(0,3).join('-');});
}
    chm.row.labels.addMenuItem ('View Box Plot', function(s,a,e){viewBoxPlotExpression(_chm_e(s,a,getLabelValue));})
    chm.row.labels.addMenuItem ('View Points Plot', function(s,a,e){viewPointsPlotExpression(_chm_e(s,a,getLabelValue));})
    chm.row.labels.addMenuItem ('View NCBI Gene', function(s,a,e){openNCBIGenePage(_chm_e(s,a,getLabelValue));})
    chm.row.labels.addMenuItem ('Search ClinicalTrials.gov for all', function(s,a,e){searchClinicalTrials(_chm_e(s,a,getLabelValue));})
    chm.row.labels.addMenuItem ('View Genecard', function(s,a,e){openGeneCardPage(_chm_e(s,a,getLabelValue));})
    chm.row.labels.addMenuItem ('Search in Google Scholar', function(s,a,e){searchGoogleScholar((_chm_e(s,a,getLabelValue)));})
    chm.row.labels.addMenuItem ('View Ideogram', function(s,a,e){viewGenesetIdeogramG(_chm_e(s,a,getLabelValue));})
    chm.row.labels.addMenuItem ('Search NCBI databases', function(s,a,e){searchNCBIDatabases(_chm_e(s,a,getLabelValue));})
    chm.row.labels.addMenuItem ('Search Pubmed for all', function(s,a,e){searchPubmedAll((_chm_e(s,a,getLabelValue)));})
    chm.row.labels.addMenuItem ('Search Pubmed for any', function(s,a,e){searchPubmedAny((_chm_e(s,a,getLabelValue)));})
    chm.row.labels.addMenuItem ('View in Zodiac', function(s,a,e){viewZodiacG(_chm_e(s,a,getLabelValue));})
    chm.row.labels.addMenuItem ('View in cBioPortal', function(s,a,e){fzPJRjOpnxWkj1ZE(_chm_e(s,a,getLabelValue));})
    chm.row.dendrogram.addMenuItem ('View Box Plot', function(s,a,e){viewBoxPlotExpression(_chm_e(s,a,getLabelValue));})
    chm.row.dendrogram.addMenuItem ('View Points Plot', function(s,a,e){viewPointsPlotExpression(_chm_e(s,a,getLabelValue));})
    chm.row.dendrogram.addMenuItem ('View NCBI Gene', function(s,a,e){openNCBIGenePage(_chm_e(s,a,getLabelValue));})
    chm.row.dendrogram.addMenuItem ('Search ClinicalTrials.gov for all', function(s,a,e){searchClinicalTrials(_chm_e(s,a,getLabelValue));})
    chm.row.dendrogram.addMenuItem ('View Genecard', function(s,a,e){openGeneCardPage(_chm_e(s,a,getLabelValue));})
    chm.row.dendrogram.addMenuItem ('Search in Google Scholar', function(s,a,e){searchGoogleScholar((_chm_e(s,a,getLabelValue)));})
    chm.row.dendrogram.addMenuItem ('View Ideogram', function(s,a,e){viewGenesetIdeogramG(_chm_e(s,a,getLabelValue));})
    chm.row.dendrogram.addMenuItem ('Search NCBI databases', function(s,a,e){searchNCBIDatabases(_chm_e(s,a,getLabelValue));})
    chm.row.dendrogram.addMenuItem ('Search Pubmed for all', function(s,a,e){searchPubmedAll((_chm_e(s,a,getLabelValue)));})
    chm.row.dendrogram.addMenuItem ('Search Pubmed for any', function(s,a,e){searchPubmedAny((_chm_e(s,a,getLabelValue)));})
    chm.row.dendrogram.addMenuItem ('View in Zodiac', function(s,a,e){viewZodiacG(_chm_e(s,a,getLabelValue));})
    chm.row.dendrogram.addMenuItem ('View in cBioPortal', function(s,a,e){fzPJRjOpnxWkj1ZE(_chm_e(s,a,getLabelValue));})
    chm.column.labels.addMenuItem ('View in cBioPortal', function(s,a,e){fvpGo36sqyhcShVf(chmSO2(_chm_e(s,a,getLabelValue)));})
    chm.column.dendrogram.addMenuItem ('View in cBioPortal', function(s,a,e){fvpGo36sqyhcShVf(chmSO2(_chm_e(s,a,getLabelValue)));})
})(MDACC_GLOBAL_NAMESPACE.namespace('tcga').chm);
