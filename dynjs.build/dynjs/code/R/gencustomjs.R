#! /usr/bin/Rscript
###
### gendynjs
###

##
# Invoke with environment variable HTTP_REFERER set appropriately.
#
# $ export HTTP_REFERER=http://www.example.org
# $ export USE_TEST_DATA=1      # use this to run with provided test data
# $ Rscript R/gendynjs.R gendynjs-specific-options (see below)
#
##

### BEGIN CUSTOM ##############################################################
#
# Invoke with environment variable CHMURL set file containing base URL of CHM server
# $ export CHMURL=/etc/chm-server-url.txt
# $ cat /etc/chm-server-url.txt
# http://server:port/chm
# $
#
# Function-specific code (until 'END CUSTOM' comment below).
#

library (httr)

# Define command line parameters.
GDspec <- c(
    "outfile", 'o', 1, "character", "output file",
    "chm",     'm', 1, "character", "clustered heat map",
    "verbose", 'v', 0, "logical",   "output more trace (optional)",
    "help",    'h', 0, "logical",   "display usage"
);

# This function sets default values for optional parameters that were not specified.
#
GDdefaults <- function (opt)
{
    if (is.null (opt$verbose)) { opt$verbose <- FALSE; }
    opt
}

# Read the required data based on validated chm_dir and specified options.
GDreadData <- function (chm_dir, opt)
{
    # Determine the samples in the CHM from the column labels of the main data file.
    data <- new.env();
    data$extra.properties <- NULL;
    data$datasets <- NULL;
    r <- GET (sprintf ("%s/undefined/%s", chm_dir, "extra.properties"));
    if (http_status(r)$category == "Success") {
	eprops <- content (r, "text");
	data$extra.properties <- strsplit (eprops, "\n")[[1]];
    };
    r <- GET (sprintf ("%s/undefined/%s", chm_dir, "datasets.tsv"));
    if (http_status(r)$category == "Success") {
	dsinfo <- content (r, "text");
	data$datasets <- read.delim (textConnection(dsinfo), as.is=TRUE);
	stopifnot ("Dataset" %in% names(data$datasets));
	stopifnot ("Description" %in% names(data$datasets));
    }


    return (data);
}

addAxisTypes <- function (chm, extra.props, axis) {
    pat <- sprintf ("^axistype.%s=", axis);
    idx <- which(vapply(extra.props, function(x)regexpr(pat,x)==1, TRUE));
    if (length(idx) > 0) {
	prop <- extra.props[idx[length(idx)]];
        match <- regexpr (pat, prop);
	types <- strsplit (substring(prop, attr(match,"match.length")+1), ",")[[1]];
	for (tt in types) chm <- chmAddAxisType (chm, axis, tt);
    }
    chm
}

addExtraParams <- function (chm, extra.props) {
    pat <- "^extraparam:";
    idx <- which(vapply(extra.props, function(x)regexpr(pat,x)==1, TRUE));
    for (ii in idx) {
	prop <- extra.props[ii];
        match <- regexpr (pat, prop);
	assign <- substring(prop, attr(match,"match.length")+1);
	match <- regexpr ('=', assign);
	if (match == -1) stop (sprintf ('extraparam definition for "%s" does not have a value assigned', assign));
	if (match == 1) stop (sprintf ('extraparam definition "%s" does not have a parameter name', assign));
	paramname <- substr (assign, 1, match-1);
	paramvalue <- substring (assign, match+1);
	chm <- chmAddProperty (chm, sprintf("!extraparam:%s", paramname), paramvalue);
    }
    chm
}

getDatasetType <- function (dataset, axis, extra.props) {
    type <- NULL;
    pat <- sprintf ("^datasettype:%s-%s=", make.names(dataset), axis);
    idx <- which(vapply(extra.props, function(x)regexpr(pat,x)==1, TRUE));
    if (length(idx) > 0) {
        prop <- extra.props[[idx[length(idx)]]];
	match <- regexpr (pat, prop);
	type <- substring (prop, attr(match, 'match.length')+1);
    }
    type
}

addDatasets <- function (chm, dummydata, datasets, extra.props) {
    if (length(datasets) > 0) {
        for (ii in 1:nrow(datasets)) {
	    dset <- datasets[ii,];
	    rowtype <- getDatasetType (dset$Dataset, "row", extra.props);
	    coltype <- getDatasetType (dset$Dataset, "column", extra.props);
	    chm <- chmAdd (chm, chmNewDataset (dset$Dataset, dset$Description, dummydata, rowtype, coltype));
	}
    }
    chm
}

# Perform required analysis of input data.  Command-line parameters are made
# available in params.
#
GDprocData <- function (params, inputdata)
{
    appcfgs <- paste(sort(list.dirs(path = "/dyce/dynjs", full.names = TRUE, recursive = FALSE)), collapse=':');
    if (appcfgs == "") appcfgs <- "/dev/null";
    Sys.setenv (NGCHMCONFIGPATH=paste("/etc/ngchm",appcfgs,sep=":"));
    require (NGCHM);
    dummydata <- matrix (0.0, nrow=1, ncol=1);
    rownames(dummydata) <- "row";
    colnames(dummydata) <- "col";
    chm <- chmNew ('dummy', dummydata);
    chm <- addAxisTypes (chm, inputdata$extra.properties, 'row');
    chm <- addAxisTypes (chm, inputdata$extra.properties, 'column');
    chm <- addAxisTypes (chm, inputdata$extra.properties, 'both');
    chm <- addExtraParams (chm, inputdata$extra.properties);
    chm <- addDatasets (chm, dummydata, inputdata$datasets, inputdata$extra.properties);
    chm
}

# Create Javascript file containing requested customization code.
GDgenCustomJS <- function (opt, inputdata, procdata)
{
    chmWriteCustomJS (procdata, opt$outfile);
}

custom <- list (commandSpec = GDspec,
                commandDefaults = GDdefaults,
                readData = GDreadData,
		processData = GDprocData,
                genOutput = list("js"=GDgenCustomJS));

### END CUSTOM ################################################################


library(getopt)
library(tools)
library(XML)


##-----------------------------------------------------------------------------
getHostFromReferer <- function() {
    nosuch <- "nosuch.example.org"
    tryCatch({
             referer <- Sys.getenv("HTTP_REFERER")
             XML::parseURI(referer)$server
         },
         error=nosuch)
}


##-----------------------------------------------------------------------------
determineAccess <- function() {
    access_file <- Sys.getenv("ACCESS");
    if (!nzchar(access_file)) return ('');
    tryCatch({
            if (!file.exists(access_file)) {
                warning ("ACCESS file does not exist")
		access.df <- data.frame (Access="external", Server="DEFAULT");
            } else {
		access.df <- read.delim(access_file,
					as.is=TRUE,
					comment.char="#")

		## Ensure required columns exist
		reqdColnames <- c("Server", "Access")
		found <- reqdColnames %in% colnames(access.df)
		if (!(all(found))) {
		    missingColumns <- reqdColnames[!found]
		    stop(sprintf(ngettext(length(missingColumns),
					  "missing required column: %s",
					  "missing required columns: %s"),
				 paste(dQuote(missingColumns), collapse=", ")))
		}
	    }
        },
        error=function(cond) {
            stop(sprintf("cannot load access data from file %s: %s",
                         dQuote(access_file),
                         conditionMessage(cond)))
        })

    server <- getHostFromReferer()
    x.server <- match(server, access.df$Server, nomatch=0)
    if (x.server == 0) {
        message(sprintf("unknown server: <%s>", server))
        x.server <- match("DEFAULT", access.df$Server, nomatch=0)
        if (x.server == 0) {
            warning("access file should define DEFAULT access")
        }
    }

    access <- if (x.server != 0) {
                  access.df$Access[x.server]
              } else {
                  "default"
              }

    access
}

##
## Main
##

## Get name of this script
scriptname <- basename(get_Rscript_filename())

## Create command-line argument specification
spec <- matrix(custom$commandSpec,
               byrow=TRUE,
               ncol=5,
               dimnames=list(NULL,
                             c("longflag",
                               "shortflag",
                               "argrequired",
                               "datatype",
                               "description")))

## Read and parse the command-line arguments
opt <- getopt(spec)

## Provide default values for optional specification fields
opt$opterr <- NULL;
opt <- custom$commandDefaults (opt);
if (is.null(opt$help))    { opt$help    <- FALSE }

## Validate command-line arguments
if (is.null(opt$opterr)) {
    opterr <- FALSE
    for (row in seq_len(nrow(spec))) {
	argrequired <- spec[row, "argrequired"]

	## Verify required arguments are specified
	if (argrequired == 1) {
	    datatype <- spec[row, "datatype"]
	    if (datatype == "character") {
		argname  <- spec[row, "longflag"]
		if (is.null(opt[[argname]]) || !nzchar(opt[[argname]])) {
		    message(sprintf("%s: unspecified %s",
				    scriptname,
				    spec[row, "description"]))
		    opt$help <- opterr <- TRUE
		    break
		}
	    }
	}
    }
} else {
    message(sprintf("%s: %s", scriptname, opt$opterr));
    opt$help <- opterr <- TRUE;
}

## If help was requested or validation failed, print usage and die
if (opt$help) {
    message(getopt(spec, usage=TRUE, command=paste("Rscript", scriptname)))
    quit("no", status=if (opterr) 2 else 0)
}

## Set script's root
apphome_dir <- Sys.getenv("APPHOME")
if (!nzchar(apphome_dir)) {
    apphome_dir <- "."
}

## Enable test mode? (nonzero integer is true; zero or unset is false)
testModeEnabled <- isTRUE(as.logical(strtoi(Sys.getenv("USE_TEST_DATA"))))

## Determine which CHM root to use
root_dirname <- if (!testModeEnabled) {
                    ""
                } else {
                    message("### Test mode enabled ###")
                    file.path(apphome_dir, "share")
                }

chmurl <- sprintf ("%s/data/%s", readLines (Sys.getenv("CHMURL")), opt$chm);
cat (sprintf ("CHMURL is %s\n", chmurl), file=stderr());

## Generate plot
sdata <- custom$readData (chmurl, opt);
chartitems <- custom$processData (opt, sdata);
valid.suffixes <- names (custom$genOutput);
suffix <- tolower(file_ext(opt$outfile));
idx <- which (valid.suffixes == suffix);
if (length(idx) == 0) {
    stop(sprintf("output file extension (%s) must be one of: [%s]",
			suffix,
			paste(valid.suffixes, collapse="|")));
}
custom$genOutput[[idx]](opt, sdata, chartitems);

quit("no", status=0)

