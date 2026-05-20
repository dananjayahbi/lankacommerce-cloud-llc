from django.urls import path

from apps.crm.views.customer_views import CustomerDetailView, CustomerListCreateView
from apps.crm.views.broadcast_view import BroadcastView
from apps.crm.views.cron_views import BirthdayGreetingCronView
from apps.crm.views.customer_import_view import CustomerImportView
from apps.crm.views.supplier_views import SupplierListCreateView, SupplierDetailView, SupplierArchiveView
from apps.crm.views.purchase_order_views import (
    PurchaseOrderListCreateView,
    PurchaseOrderDetailView,
    PurchaseOrderReceiveView,
    PurchaseOrderSendWhatsAppView,
)

urlpatterns = [
    # Customers
    path("customers/", CustomerListCreateView.as_view(), name="crm_customer_list_create"),
    path("customers/<uuid:id>/", CustomerDetailView.as_view(), name="crm_customer_detail"),
    path("customers/broadcast/", BroadcastView.as_view(), name="crm_broadcast"),
    path("customers/import/", CustomerImportView.as_view(), name="crm_customer_import"),
    # Suppliers
    path("suppliers/", SupplierListCreateView.as_view(), name="crm_supplier_list_create"),
    path("suppliers/<uuid:id>/", SupplierDetailView.as_view(), name="crm_supplier_detail"),
    path("suppliers/<uuid:id>/archive/", SupplierArchiveView.as_view(), name="crm_supplier_archive"),
    # Purchase Orders
    path("purchase-orders/", PurchaseOrderListCreateView.as_view(), name="crm_po_list_create"),
    path("purchase-orders/<uuid:id>/", PurchaseOrderDetailView.as_view(), name="crm_po_detail"),
    path("purchase-orders/<uuid:id>/receive/", PurchaseOrderReceiveView.as_view(), name="crm_po_receive"),
    path("purchase-orders/<uuid:id>/send-whatsapp/", PurchaseOrderSendWhatsAppView.as_view(), name="crm_po_send_whatsapp"),
    # Cron
    path("cron/birthday-greetings/", BirthdayGreetingCronView.as_view(), name="crm_birthday_cron"),
]
