//Handle Scrape button
$("#scrape").on("click", function() {
    $.ajax({
        method: "GET",
        url: "/api/scrape"
    }).done(function(data) {
        window.location = "/";
    });
});

//Handle clearing of scrapped items not saved
$("#clear").on("click", function() {
    $.ajax({
        method: "DELETE",
        url: "/api/clear/scraped"
    }).done(function(data) {
        window.location = "/";
    });
});

//Handle clearing of items that are on the saved list
$("#clear-saved").on("click", function() {
    $.ajax({
        method: "DELETE",
        url: "/api/clear/saved"
    }).done(function(data) {
        window.location = "/saved";
    });
});

//Set clicked nav option to active
$(".navbar-nav li").click(function() {
    $(".navbar-nav li").removeClass("active");
    $(this).addClass("active");
});

//Handle Save Article button
$(".save").on("click", function() {
    var thisId = $(this).attr("data-id");
    $.ajax({
        method: "POST",
        url: `/api/articles/save/${thisId}`
    }).done(function(data) {
        window.location = "/";
    });
});

//Handle Delete Article button
$(".delete").on("click", function() {
    var thisId = $(this).attr("data-id");
    $.ajax({
        method: "POST",
        url: `/api/articles/delete/${thisId}`
    }).done(function(data) {
        window.location = "/saved";
    });
});

//Handle Save Note button
$(".saveNote").on("click", function() {
    var thisId = $(this).attr("data-id");
    if (!$("#noteText" + thisId).val()) {
        alert("please enter a note to save");
    } else {
        $.ajax({
            method: "POST",
            url: `/api/notes/save/${thisId}`,
            data: {
                text: $("#noteText" + thisId).val()
            }
        }).done(function(data) {
            // Log the response

            // Empty the notes section
            $("#noteText" + thisId).val("");
            $(".modalNote").modal("hide");
            window.location = "/saved";
        });
    }
});

//Handle Delete Note button
$(".deleteNote").on("click", function() {
    var noteId = $(this).attr("data-note-id");
    var articleId = $(this).attr("data-article-id");
    $.ajax({
        method: "DELETE",
        url: `/api/notes/delete/${noteId}/${articleId}`
    }).done(function(data) {
        $(".modalNote").modal("hide");
        window.location = "/saved";
    });
});
