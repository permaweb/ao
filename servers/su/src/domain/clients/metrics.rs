use prometheus_client::encoding::text::encode;
use prometheus_client::encoding::{EncodeLabelSet, EncodeLabelValue};
use prometheus_client::metrics::counter::Counter;
use prometheus_client::metrics::family::Family;
use prometheus_client::metrics::histogram::Histogram;
use prometheus_client::registry::Registry;

use super::super::config::AoConfig;
use super::super::core::dal::CoreMetrics;

#[derive(Clone, Debug, Hash, PartialEq, Eq, EncodeLabelSet)]
struct HttpLabels {
    method: Method,
    path: String,
}

#[derive(Clone, Debug, Hash, PartialEq, Eq, EncodeLabelValue)]
enum Method {
    GET,
    POST,
}

pub struct PromMetrics {
    enabled: bool,
    registry: Registry,
    http_requests: Family<HttpLabels, Counter>,
    get_process_histogram: Histogram,
    get_message_histogram: Histogram,
    get_messages_histogram: Histogram,
    serialize_json_histogram: Histogram,
    read_message_data_histogram: Histogram,
    write_item_histogram: Histogram,
    write_assignment_histogram: Histogram,
    acquire_write_lock_histogram: Histogram,
}

impl PromMetrics {
    pub fn new(config: AoConfig) -> Self {
        let mut registry = <Registry>::default();
        let http_requests = Family::<HttpLabels, Counter>::default();
        registry.register(
            "ao_su_http_requests",
            "Number of HTTP requests received",
            http_requests.clone(),
        );
        let individual_object_retrieval = [
            1.0, 5.0, 10.0, 25.0, 50.0, 100.0
        ];
        let message_list_retrieval = [
            1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0, 2000.0, 3000.0, 4000.0, 5000.0, 
            6000.0, 7000.0, 8000.0, 9000.0, 10000.0
        ];
        let serialization = [
            1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0, 2000.0, 3000.0
        ];
        let writes = [
            1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 250.0, 500.0, 1000.0, 2500.0, 5000.0
        ];
        let locks = [
            1.0, 5.0, 10.0, 25.0, 50.0, 100.0, 200.0, 300.0, 400.0, 500.0
        ];
        let get_process_histogram = Histogram::new(individual_object_retrieval.into_iter());
        let get_message_histogram = Histogram::new(individual_object_retrieval.into_iter());
        let get_messages_histogram = Histogram::new(message_list_retrieval.into_iter());
        let serialize_json_histogram = Histogram::new(serialization.into_iter());
        let read_message_data_histogram = Histogram::new(message_list_retrieval.into_iter());
        let write_item_histogram = Histogram::new(writes.into_iter());
        let write_assignment_histogram = Histogram::new(writes.into_iter());
        let acquire_write_lock_histogram = Histogram::new(locks.into_iter());
        registry.register(
            "ao_su_get_process_histogram",
            "Process retrieval runtime",
            get_process_histogram.clone(),
        );
        registry.register(
            "ao_su_get_message_histogram",
            "Histogram of get_message_observe durations",
            get_message_histogram.clone(),
        );
        registry.register(
            "ao_su_get_messages_histogram",
            "Histogram of get_messages_observe durations",
            get_messages_histogram.clone(),
        );
        registry.register(
            "ao_su_serialize_json_histogram",
            "Histogram of serialize_json_observe durations",
            serialize_json_histogram.clone(),
        );
        registry.register(
            "ao_su_read_message_data_histogram",
            "Histogram of read_message_data_observe durations",
            read_message_data_histogram.clone(),
        );
        registry.register(
            "ao_su_write_item_histogram",
            "Histogram of write_item_observe durations",
            write_item_histogram.clone(),
        );
        registry.register(
            "ao_su_write_assignment_histogram",
            "Histogram of write_assignment_observe durations",
            write_assignment_histogram.clone(),
        );
        registry.register(
            "ao_su_acquire_write_lock_histogram",
            "Histogram of acquire_write_lock_histogram durations",
            acquire_write_lock_histogram.clone(),
        );
        PromMetrics {
            enabled: config.enable_metrics,
            registry,
            http_requests,
            get_process_histogram,
            get_message_histogram,
            get_messages_histogram,
            serialize_json_histogram,
            read_message_data_histogram,
            write_item_histogram,
            write_assignment_histogram,
            acquire_write_lock_histogram,
        }
    }

    pub fn get_request(&self, route: String) {
        if !self.enabled {
            return;
        };
        self.http_requests
            .get_or_create(&HttpLabels {
                method: Method::GET,
                path: route,
            })
            .inc();
    }

    pub fn post_request(&self) {
        if !self.enabled {
            return;
        };
        self.http_requests
            .get_or_create(&HttpLabels {
                method: Method::POST,
                path: "/".to_string(),
            })
            .inc();
    }

    pub fn emit_metrics(&self) -> Result<String, String> {
        if !self.enabled {
            return Err("Metrics not enabled".to_string());
        };
        let mut buffer = String::new();
        match encode(&mut buffer, &self.registry) {
            Ok(_) => Ok(buffer),
            Err(e) => Err(format!("{:?}", e)),
        }
    }
}

impl CoreMetrics for PromMetrics {
    fn get_process_observe(&self, duration: u128) {
        if !self.enabled {
            return;
        }
        self.get_process_histogram.observe(duration as f64);
    }

    fn get_message_observe(&self, duration: u128) {
        if !self.enabled {
            return;
        }
        self.get_message_histogram.observe(duration as f64);
    }

    fn get_messages_observe(&self, duration: u128) {
        if !self.enabled {
            return;
        }
        self.get_messages_histogram.observe(duration as f64);
    }

    fn serialize_json_observe(&self, duration: u128) {
        if !self.enabled {
            return;
        }
        self.serialize_json_histogram.observe(duration as f64);
    }

    fn read_message_data_observe(&self, duration: u128) {
        if !self.enabled {
            return;
        }
        self.read_message_data_histogram.observe(duration as f64);
    }

    fn write_item_observe(&self, duration: u128) {
        if !self.enabled {
            return;
        }
        self.write_item_histogram.observe(duration as f64);
    }

    fn write_assignment_observe(&self, duration: u128) {
        if !self.enabled {
            return;
        }
        self.write_assignment_histogram.observe(duration as f64);
    }

    fn acquire_write_lock_observe(&self, duration: u128) {
        if !self.enabled {
            return;
        }
        self.acquire_write_lock_histogram.observe(duration as f64);
    }
}
