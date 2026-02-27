ZOHO.embeddedApp.on("PageLoad", function (data) {
    console.clear();
    var Entity = data.Entity;
    var recordId = data.EntityId[0];

    var conn_name = "createinvoice";
    var req_data = {
        "parameters": {},
        "headers": {},
        "method": "GET",
        "url": "https://www.zohoapis.com/books/v3/invoices?organization_id=909376690&zcrm_potential_id=" + recordId,
        "param_type": 1
    };

    ZOHO.CRM.CONNECTION.invoke(conn_name, req_data).then(function (data) {
        var invoices = data.details.statusMessage.invoices;
        var unpaidInvoices = invoices.filter(function (invoice) {
            return invoice.status !== "paid";
        });
        console.log(unpaidInvoices);

        // Capture customer_id from the invoice response (available on all invoices)
        if (invoices.length > 0) {
            window.__customerId = invoices[0].customer_id;
        }

        // Clear the initial empty row added by widget.html init
        document.getElementById("invoiceRows").innerHTML = "";
        window.invoiceRowCount = 0;

        if (unpaidInvoices.length > 0) {
            unpaidInvoices.forEach(function (invoice) {
                window.addInvoiceRow(invoice.invoice_id, invoice.balance);
            });
        } else {
            // No unpaid invoices — leave one blank row for manual entry
            window.addInvoiceRow();
        }

        window.toggleAmountSummary();
    });

    // Handle the recordPayment event fired by widget.html on form submit
    document.addEventListener("recordPayment", function (e) {
        var payload = e.detail;

        window.setPaymentLoading(true);
        console.log("Calling recordpayment function with:", JSON.stringify(payload, null, 2));

        ZOHO.CRM.FUNCTIONS.execute("recordpayment", {
            arguments: JSON.stringify({ invoice_data: JSON.stringify(payload) })
        }).then(function (response) {
            window.setPaymentLoading(false);
            console.log("Function response:", JSON.stringify(response, null, 2));

            var output = response && response.details && response.details.output;
            var result = null;
            try { result = output ? JSON.parse(output) : null; } catch (e) {}

            if (result && result.code === 0) {
                window.showPaymentNotification("Payment recorded successfully!", "success");
                window.resetPaymentForm();
            } else {
                window.showPaymentNotification(
                    (result && result.message) || "Failed to record payment.",
                    "error"
                );
            }
        }, function (err) {
            window.setPaymentLoading(false);
            console.error("Function error:", err);
            window.showPaymentNotification("An error occurred while recording payment.", "error");
        });
    });

});
ZOHO.embeddedApp.init();
